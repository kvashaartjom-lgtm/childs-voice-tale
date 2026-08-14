import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getImageProvider, ProviderError } from "../_shared/image-provider.ts";

// Phase 2b-1 — async generation worker. Invoked by pg_cron -> pg_net every
// minute (see the migration for how that call is authorised). Processes
// AT MOST one generation_job per invocation, one page at a time, and stops
// well short of the platform's function timeout so a long book resumes on
// the next tick instead of being killed mid-write. This is a SECOND,
// independent pipeline next to the existing book_jobs/voorbeeld.tsx one —
// it does not read, write, or otherwise touch book_jobs or its Storage
// paths.

const MAX_RETRIES = 3;
const BUDGET_MS = 100_000; // stay safely under the platform's hard function timeout
const LEASE_SECONDS = 180; // safety-net reclaim window if a run dies without releasing its lock
const JOB_TYPE = "page";
const BUCKET = "book-pages";

interface GenerationJobRow {
  id: string;
  book_version_id: string;
  job_type: string;
  status: string;
  progress: number;
  retry_count: number;
  provider: string | null;
  provider_job_id: string | null;
  error_code: string | null;
}

interface BookPageRow {
  id: string;
  page_number: number;
  text: string | null;
  image_storage_key: string | null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });

const pad = (n: number) => String(n).padStart(2, "0");
const nowIso = () => new Date().toISOString();

// Cheap check: the platform's own verify_jwt already validated the JWT
// signature before this handler runs; this just confirms the caller is
// service_role, not merely holding any valid Supabase-issued JWT (the
// public anon key's JWT is *also* valid and would otherwise pass). This is
// what keeps the worker un-callable from the browser.
function isServiceRoleToken(token: string): boolean {
  try {
    const payloadB64 = token.split(".")[1];
    if (!payloadB64) return false;
    const normalized = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(normalized));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

async function failJob(
  supabase: SupabaseClient,
  jobId: string,
  errorCode: string,
  retryCount?: number,
) {
  const patch: Record<string, unknown> = {
    status: "failed",
    error_code: errorCode,
    locked_at: null,
    updated_at: nowIso(),
  };
  if (retryCount !== undefined) patch.retry_count = retryCount;
  await supabase.from("generation_jobs").update(patch).eq("id", jobId);
}

async function retryJob(supabase: SupabaseClient, jobId: string, errorCode: string, retryCount: number) {
  await supabase
    .from("generation_jobs")
    .update({
      status: "queued",
      locked_at: null,
      retry_count: retryCount,
      error_code: errorCode,
      updated_at: nowIso(),
    })
    .eq("id", jobId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!isServiceRoleToken(token)) {
    return json({ error: "forbidden" }, 403);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startedAt = Date.now();

  // Atomic claim — see migration 20260814000000_generation_worker.sql for
  // the UPDATE ... WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED) mechanism
  // and why it cannot let two concurrent ticks claim the same job.
  const { data: claimedJob, error: claimError } = await supabase.rpc("claim_generation_job", {
    p_job_type: JOB_TYPE,
    p_lease_seconds: LEASE_SECONDS,
  });
  const job = claimedJob as GenerationJobRow | null;

  if (claimError) {
    console.error("generation-worker: claim failed:", claimError.message);
    return json({ error: "claim_failed" }, 500);
  }
  if (!job) {
    // No work — cheap no-op, safe to invoke every minute forever.
    return json({ ok: true, claimed: false });
  }

  const provider = getImageProvider();

  try {
    const { data: pagesData, error: pagesError } = await supabase
      .from("book_pages")
      .select("id, page_number, text, image_storage_key")
      .eq("book_version_id", job.book_version_id)
      .order("page_number", { ascending: true });
    if (pagesError) throw new Error(`pages query: ${pagesError.message}`);
    const pages = (pagesData ?? []) as BookPageRow[];

    const total = pages.length;
    if (total === 0) {
      // A job with no pages is a data problem, not a transient one —
      // retrying it forever would never fix it (docs/12-AI-PIPELINE.md).
      await failJob(supabase, job.id, "no_pages", job.retry_count);
      return json({ ok: true, claimed: true, jobId: job.id, result: "failed_no_pages" });
    }

    let done = pages.filter((p) => p.image_storage_key).length;
    const remaining = pages.filter((p) => !p.image_storage_key);

    for (const page of remaining) {
      if (Date.now() - startedAt > BUDGET_MS) {
        // Voluntary yield: release the lease and leave status=generating so
        // the next cron tick's claim query picks this job straight back up
        // instead of waiting out the lease-expiry safety net.
        await supabase
          .from("generation_jobs")
          .update({ locked_at: null, updated_at: nowIso() })
          .eq("id", job.id);
        return json({ ok: true, claimed: true, jobId: job.id, result: "budget_exceeded", done, total });
      }

      try {
        const image = await provider.generatePage({
          bookVersionId: job.book_version_id,
          pageNumber: page.page_number,
          text: page.text ?? "",
        });

        const path = `${job.book_version_id}/${pad(page.page_number)}.${image.extension}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, image.bytes, { contentType: image.contentType, upsert: true });
        if (uploadError) throw new ProviderError(`storage: ${uploadError.message}`, true);

        const { error: pageUpdateError } = await supabase
          .from("book_pages")
          .update({ image_storage_key: path })
          .eq("id", page.id);
        if (pageUpdateError) throw new ProviderError(`db: ${pageUpdateError.message}`, true);

        done += 1;
        const progress = Math.round((done / total) * 100);
        // Refresh the lease on every page, not just at claim time, so a
        // long-running single tick can't be stolen mid-way by the lease
        // timeout while it's still actively making progress.
        await supabase
          .from("generation_jobs")
          .update({ progress, locked_at: nowIso(), updated_at: nowIso(), provider: provider.name })
          .eq("id", job.id);
      } catch (pageErr) {
        const retryable = pageErr instanceof ProviderError ? pageErr.retryable : true;
        const message = pageErr instanceof Error ? pageErr.message : String(pageErr);
        console.error(`generation-worker: page ${page.page_number} failed:`, message);

        if (!retryable) {
          await failJob(supabase, job.id, message.slice(0, 200), job.retry_count);
          return json({
            ok: true, claimed: true, jobId: job.id,
            result: "failed_permanent", page: page.page_number,
          });
        }

        const nextRetryCount = job.retry_count + 1;
        if (nextRetryCount > MAX_RETRIES) {
          await failJob(supabase, job.id, message.slice(0, 200), nextRetryCount);
          return json({
            ok: true, claimed: true, jobId: job.id,
            result: "failed_retries_exhausted", page: page.page_number,
          });
        }

        await retryJob(supabase, job.id, message.slice(0, 200), nextRetryCount);
        return json({
          ok: true, claimed: true, jobId: job.id,
          result: "retrying", page: page.page_number, retryCount: nextRetryCount,
        });
      }
    }

    await supabase
      .from("generation_jobs")
      .update({ status: "completed", progress: 100, locked_at: null, updated_at: nowIso() })
      .eq("id", job.id);
    return json({ ok: true, claimed: true, jobId: job.id, result: "completed", done, total });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("generation-worker: unexpected error:", message);
    // Unclassified errors are treated as transient — a genuine one-off
    // (e.g. a dropped DB connection) gets retried rather than permanently
    // failing the job on the very first surprise.
    const nextRetryCount = job.retry_count + 1;
    if (nextRetryCount > MAX_RETRIES) {
      await failJob(supabase, job.id, message.slice(0, 200), nextRetryCount);
    } else {
      await retryJob(supabase, job.id, message.slice(0, 200), nextRetryCount);
    }
    return json({ error: "unexpected_error" }, 500);
  }
});
