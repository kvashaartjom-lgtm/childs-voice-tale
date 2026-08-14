#!/usr/bin/env node
/**
 * Phase 0 / Step 1 — RLS isolation test.
 *
 * Validates that RLS on profiles/families/children/books/book_versions/
 * book_pages/generation_jobs actually isolates users from each other, and
 * that the composite FK / unique / CHECK constraints from
 * supabase/migrations/20260813000000_phase0_core_domain.sql hold.
 *
 * Manual staging validation tool — not part of the application build, not
 * imported by any app code, and not executed in CI. This script is NOT run
 * by Claude. The project owner runs it manually against the disposable
 * staging project, from a machine with real network access to Supabase.
 * Committed to the repo so it stays reachable across machines/sessions; it
 * contains no secrets, only the names of the env vars it reads.
 *
 * Required env vars (values are read, never printed):
 *   STAGING_URL               e.g. https://<staging-ref>.supabase.co
 *   STAGING_ANON_KEY          staging project anon key
 *   STAGING_SERVICE_ROLE_KEY  staging project service_role key
 *
 * The service-role client is used ONLY for: creating/deleting the two test
 * users, and the final CASCADE-delete verification. Every RLS assertion
 * (steps 2-9) runs through an anon-key client carrying that user's own
 * session — service-role bypasses RLS entirely, so using it for user
 * actions would make every assertion pass meaninglessly regardless of
 * whether RLS actually works.
 *
 * Usage:
 *   node tools/rls-isolation-test.mjs
 *
 * Exit code: 0 if all 10 steps pass, 1 otherwise.
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import WebSocket from "ws";

// @supabase/supabase-js builds a Realtime client (which references the
// global WebSocket constructor) as soon as createClient() runs, even though
// this script never subscribes to any realtime channel. Node 20 has no
// global WebSocket (it only landed, experimentally, in later Node
// versions), so without this polyfill createClient() throws
// "ReferenceError: WebSocket is not defined" on Node 20. Setting it
// unconditionally keeps this script working on Node 20 without needing a
// version check.
globalThis.WebSocket ??= WebSocket;

const STAGING_URL = process.env.STAGING_URL;
const STAGING_ANON_KEY = process.env.STAGING_ANON_KEY;
const STAGING_SERVICE_ROLE_KEY = process.env.STAGING_SERVICE_ROLE_KEY;

for (const [name, value] of Object.entries({
  STAGING_URL,
  STAGING_ANON_KEY,
  STAGING_SERVICE_ROLE_KEY,
})) {
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
}

// Refuse to run against production even if STAGING_URL is misconfigured.
const PRODUCTION_REF = "ffgbslqxuvcvbaolxybq";
if (STAGING_URL.includes(PRODUCTION_REF)) {
  console.error(
    `Refusing to run: STAGING_URL contains the production project ref (${PRODUCTION_REF}). Aborting.`,
  );
  process.exit(1);
}

const results = [];

function record(step, pass, reason) {
  results.push({ step, pass, reason });
  console.log(`${pass ? "PASS" : "FAIL"}  step ${String(step).padStart(2)}: ${reason}`);
}

const adminClient = createClient(STAGING_URL, STAGING_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function freshAnonClient() {
  return createClient(STAGING_URL, STAGING_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Creates a test user via the admin API, then builds the "acting as this
 * user" client in two steps using two separate anon-key client instances:
 *   1. a throwaway sign-in client that exchanges email/password for a
 *      session (the "admin-created access token" — the password itself is
 *      generated here and used exactly once, immediately, then discarded)
 *   2. a second, independent anon-key client that never signs in itself —
 *      its session is bound explicitly via setSession(). This is the
 *      client every assertion below actually uses, so no state leaks in
 *      from the sign-in step.
 */
async function createTestUser(label) {
  const email = `rls-test-${label}-${crypto.randomUUID()}@example.invalid`;
  const password = crypto.randomBytes(24).toString("hex");

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created?.user) {
    throw new Error(`admin.createUser(${label}) failed: ${createError?.message ?? "no user returned"}`);
  }

  const signInClient = freshAnonClient();
  const { data: signIn, error: signInError } = await signInClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !signIn?.session) {
    throw new Error(`signInWithPassword(${label}) failed: ${signInError?.message ?? "no session returned"}`);
  }

  const actingClient = freshAnonClient();
  const { error: setSessionError } = await actingClient.auth.setSession({
    access_token: signIn.session.access_token,
    refresh_token: signIn.session.refresh_token,
  });
  if (setSessionError) {
    throw new Error(`setSession(${label}) failed: ${setSessionError.message}`);
  }

  return { id: created.user.id, email, client: actingClient, deleted: false };
}

async function deleteTestUser(user, label) {
  if (!user || user.deleted) return;
  const { error } = await adminClient.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(`cleanup: failed to delete user ${label} (${user.id}): ${error.message}`);
  } else {
    user.deleted = true;
  }
}

async function main() {
  let userA;
  let userB;
  const ids = {};

  // family -> child -> book -> book_version -> book_page -> generation_job
  const chainTables = () => [
    ["families", ids.familyId],
    ["children", ids.childId],
    ["books", ids.bookId],
    ["book_versions", ids.bookVersionId],
    ["book_pages", ids.bookPageId],
    ["generation_jobs", ids.generationJobId],
  ];

  try {
    // Step 1 — create user A and user B
    userA = await createTestUser("a");
    userB = await createTestUser("b");
    record(1, true, `created user A (${userA.id}) and user B (${userB.id})`);

    // Step 2 — as A: insert family -> child -> book -> book_version -> book_page -> generation_job
    const { data: family, error: familyErr } = await userA.client
      .from("families")
      .insert({ owner_id: userA.id, name: "RLS Test Family" })
      .select()
      .single();
    if (familyErr) throw new Error(`step 2: family insert failed: ${familyErr.message}`);
    ids.familyId = family.id;

    const { data: child, error: childErr } = await userA.client
      .from("children")
      .insert({ family_id: ids.familyId, display_name: "RLS Test Child" })
      .select()
      .single();
    if (childErr) throw new Error(`step 2: child insert failed: ${childErr.message}`);
    ids.childId = child.id;

    const { data: book, error: bookErr } = await userA.client
      .from("books")
      .insert({ family_id: ids.familyId, child_id: ids.childId, title: "RLS Test Book" })
      .select()
      .single();
    if (bookErr) throw new Error(`step 2: book insert failed: ${bookErr.message}`);
    ids.bookId = book.id;

    const { data: bookVersion, error: bvErr } = await userA.client
      .from("book_versions")
      .insert({ book_id: ids.bookId, version_number: 1 })
      .select()
      .single();
    if (bvErr) throw new Error(`step 2: book_version insert failed: ${bvErr.message}`);
    ids.bookVersionId = bookVersion.id;

    const { data: bookPage, error: bpErr } = await userA.client
      .from("book_pages")
      .insert({ book_version_id: ids.bookVersionId, page_number: 1, text: "Once upon a time" })
      .select()
      .single();
    if (bpErr) throw new Error(`step 2: book_page insert failed: ${bpErr.message}`);
    ids.bookPageId = bookPage.id;

    const { data: genJob, error: gjErr } = await userA.client
      .from("generation_jobs")
      .insert({ book_version_id: ids.bookVersionId, job_type: "story" })
      .select()
      .single();
    if (gjErr) throw new Error(`step 2: generation_job insert failed: ${gjErr.message}`);
    ids.generationJobId = genJob.id;

    record(
      2,
      true,
      `A inserted family=${ids.familyId} child=${ids.childId} book=${ids.bookId} ` +
        `book_version=${ids.bookVersionId} book_page=${ids.bookPageId} generation_job=${ids.generationJobId}`,
    );

    // Step 3 — as A: read all six rows back, must succeed
    {
      let ok = true;
      const reasons = [];
      for (const [table, id] of chainTables()) {
        const { data, error } = await userA.client.from(table).select("id").eq("id", id).maybeSingle();
        if (error || !data) {
          ok = false;
          reasons.push(`${table}: ${error?.message ?? "not found"}`);
        }
      }
      record(3, ok, ok ? "A read back all six rows" : `A failed to read: ${reasons.join("; ")}`);
    }

    // Step 4 — as B: select each of A's six rows by id, must return ZERO rows (not an error)
    {
      let ok = true;
      const reasons = [];
      for (const [table, id] of chainTables()) {
        const { data, error } = await userB.client.from(table).select("id").eq("id", id);
        if (error) {
          ok = false;
          reasons.push(`${table}: unexpected error instead of empty result: ${error.message}`);
        } else if (data.length !== 0) {
          ok = false;
          reasons.push(`${table}: leaked ${data.length} row(s) to B`);
        }
      }
      record(4, ok, ok ? "B's SELECT returned zero rows for all six of A's records" : reasons.join("; "));
    }

    // Step 5 — as B: UPDATE and DELETE each of A's rows, must affect zero rows
    {
      let ok = true;
      const reasons = [];
      const updatePayload = {
        families: { name: "hacked-by-b" },
        children: { display_name: "hacked-by-b" },
        books: { title: "hacked-by-b" },
        book_versions: { status: "cancelled" },
        book_pages: { text: "hacked-by-b" },
        generation_jobs: { status: "cancelled" },
      };
      for (const [table, id] of chainTables()) {
        const { data: upd, error: updErr } = await userB.client
          .from(table)
          .update(updatePayload[table])
          .eq("id", id)
          .select();
        if (updErr) {
          ok = false;
          reasons.push(`${table}: UPDATE errored instead of silently affecting zero rows: ${updErr.message}`);
        } else if (upd.length !== 0) {
          ok = false;
          reasons.push(`${table}: UPDATE affected ${upd.length} row(s)`);
        }

        const { data: del, error: delErr } = await userB.client.from(table).delete().eq("id", id).select();
        if (delErr) {
          ok = false;
          reasons.push(`${table}: DELETE errored instead of silently affecting zero rows: ${delErr.message}`);
        } else if (del.length !== 0) {
          ok = false;
          reasons.push(`${table}: DELETE affected ${del.length} row(s)`);
        }
      }
      record(5, ok, ok ? "B's UPDATE/DELETE affected zero rows on all six tables" : reasons.join("; "));
    }

    // Step 6 — as B: INSERT a child referencing A's family_id, must be rejected
    {
      const { error } = await userB.client
        .from("children")
        .insert({ family_id: ids.familyId, display_name: "B intrusion" });
      record(
        6,
        !!error,
        error
          ? `B's insert into A's family was rejected: ${error.message}`
          : "B was able to insert into A's family — RLS FAILURE",
      );
    }

    // Step 7 — as A: insert a book with A's family_id but a child_id from a different family
    {
      const { data: otherFamily, error: otherFamilyErr } = await userA.client
        .from("families")
        .insert({ owner_id: userA.id, name: "RLS Test Other Family" })
        .select()
        .single();
      if (otherFamilyErr) throw new Error(`step 7 setup: other family insert failed: ${otherFamilyErr.message}`);
      ids.otherFamilyId = otherFamily.id;

      const { data: otherChild, error: otherChildErr } = await userA.client
        .from("children")
        .insert({ family_id: ids.otherFamilyId, display_name: "RLS Test Other Child" })
        .select()
        .single();
      if (otherChildErr) throw new Error(`step 7 setup: other child insert failed: ${otherChildErr.message}`);
      ids.otherChildId = otherChild.id;

      const { error } = await userA.client
        .from("books")
        .insert({ family_id: ids.familyId, child_id: ids.otherChildId, title: "Cross family book" });
      record(
        7,
        !!error,
        error
          ? `cross-family (family_id, child_id) insert rejected: ${error.message}`
          : "cross-family book insert SUCCEEDED — composite FK FAILURE",
      );
    }

    // Step 8 — two book_versions with the same (book_id, version_number)
    {
      const { error } = await userA.client
        .from("book_versions")
        .insert({ book_id: ids.bookId, version_number: 1 });
      record(
        8,
        !!error,
        error
          ? `duplicate (book_id, version_number) rejected: ${error.message}`
          : "duplicate (book_id, version_number) was inserted — unique constraint FAILURE",
      );
    }

    // Step 9 — generation_jobs.progress = 150
    {
      const { error } = await userA.client
        .from("generation_jobs")
        .insert({ book_version_id: ids.bookVersionId, job_type: "story", progress: 150 });
      record(
        9,
        !!error,
        error
          ? `progress=150 rejected: ${error.message}`
          : "progress=150 was accepted — CHECK constraint FAILURE",
      );
    }

    // Step 10 — delete user A via admin API, verify CASCADE removed every domain row
    {
      const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userA.id);
      if (deleteErr) throw new Error(`step 10: admin deleteUser(A) failed: ${deleteErr.message}`);
      userA.deleted = true;

      const cascadeChecks = [
        ["profiles", userA.id],
        ["families", ids.familyId],
        ["families", ids.otherFamilyId],
        ["children", ids.childId],
        ["children", ids.otherChildId],
        ["books", ids.bookId],
        ["book_versions", ids.bookVersionId],
        ["book_pages", ids.bookPageId],
        ["generation_jobs", ids.generationJobId],
      ];

      let ok = true;
      const reasons = [];
      for (const [table, id] of cascadeChecks) {
        const { data, error } = await adminClient.from(table).select("id").eq("id", id).maybeSingle();
        if (error) {
          ok = false;
          reasons.push(`${table}: query error ${error.message}`);
        } else if (data) {
          ok = false;
          reasons.push(`${table}: row ${id} still exists after CASCADE`);
        }
      }
      record(
        10,
        ok,
        ok
          ? "A's profile, both families, both children, book, book_version, book_page and generation_job were all cascade-deleted"
          : reasons.join("; "),
      );
    }
  } catch (err) {
    console.error(`\nUNEXPECTED ERROR: ${err.message}`);
    results.push({ step: "?", pass: false, reason: err.message });
  } finally {
    await deleteTestUser(userA, "A");
    await deleteTestUser(userB, "B");
  }

  console.log("\n=== SUMMARY ===");
  console.log("step | result | reason");
  console.log("-----|--------|-------");
  for (const r of results) {
    console.log(`${String(r.step).padEnd(4)} | ${r.pass ? "PASS  " : "FAIL  "} | ${r.reason}`);
  }

  const allPass = results.length === 10 && results.every((r) => r.pass);
  console.log(`\n${allPass ? "ALL 10 STEPS PASSED" : "AT LEAST ONE STEP FAILED"}`);
  process.exit(allPass ? 0 : 1);
}

main();
