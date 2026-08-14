# Deferred Work Register

This is not a general backlog. It only holds work that was **deliberately
postponed with a temporary solution already in place**, each with an
explicit condition for coming back to it. Follows the spirit of
`33-DECISION-LOG-TEMPLATE.md`, structured per item.

Fields per entry: what was deferred, why, what stands in its place now,
what it blocks, when to return, and what signals that the time has come.

---

## Paid Gemini API for AI generation (story + images)

**Deferred:** paid Gemini API access for AI generation.

**Reason:** the free tier quota is exhausted for the whole pipeline, not
just images. Confirmed by live testing against production:
`generate-story` returns `546` and `generate-character` returns `429`.
Both story text and illustration generation are currently non-functional
on the free tier; no budget available right now.

**Temporary solution:** `generateBook()` already falls back to mock story
text silently when `generate-story` fails — existing prototype behavior,
not new. For images, an `IMAGE_PROVIDER=mock` adapter is planned but
**not built yet** (Step 2b).

**Blocks:** the first real paid order — and more than originally recorded.
A book still can't be printed without real illustrations, but on top of
that, no book currently produced in production has real AI-generated
story text either: every one falls back to the mock story. This is a hard
launch blocker for the entire AI pipeline, not only illustrations.

**Return by:** end of Phase 1.

**Trigger:** budget becomes available, OR the first real order approaches.

**Note:** set a spend cap on the API key from day one. Mock story text is
currently being persisted into `book_pages.text` in production (via
`persistBookRecord`, Phase 0 / Step 2a) — those rows are placeholder
content, not real user stories, until this quota issue is resolved.

---

## Storage cleanup on cascade delete

**Deferred:** removing Storage objects (character sheets, page images) when
the database rows that reference them are deleted.

**Reason:** Phase 0 / Step 1 established DB-level `CASCADE` from
`auth.users` down through `families` → `children` → `books` →
`book_versions` → `book_pages` / `generation_jobs`, so deleting an account
cleanly removes every domain row in one operation. Storage is a separate
system with no equivalent cascade, and building that cleanup path was out
of scope for that task. Recorded as a genuine TODO in the Phase 0.1 report.

**Temporary solution:** none — right now this is harmless, because nothing
writes `book_pages.image_storage_key` yet, so there are no orphaned Storage
objects to worry about.

**Blocks:** GDPR-compliant account/data deletion once page images exist.
Until then, deleting a user's domain rows deletes their data as far as the
database is concerned, but any generated images sitting in Storage would
survive the delete — an accurate deletion story requires both to happen
together.

**Return by:** before page images start being generated and persisted.

**Trigger:** the moment `book_pages.image_storage_key` starts being written.

---

## Rules for adding to this register

Only add an entry when there is a temporary solution actually in place, not
for arbitrary future work. Every entry needs a concrete trigger — "later"
is not a trigger.
