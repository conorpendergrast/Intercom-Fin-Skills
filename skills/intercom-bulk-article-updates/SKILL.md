---
name: intercom-bulk-article-updates
description: >
  Safely read, edit, and bulk-update the BODY of Intercom Help Center articles via
  the Intercom CLI or API without corrupting them or losing progress. Use this skill
  whenever you are about to run a bulk or programmatic change across many articles —
  dead-link repoints, terminology corrections, find-and-replace across a Help Center,
  applying an audit's decisions, or any code that calls `update_article` / `PUT
  /articles/{id}`. Also trigger when someone says "bulk edit articles", "apply the
  audit", "repoint the links", "fix the Help Center", "update these articles", "mass
  update Intercom content", or when fetching a whole Help Center's bodies for analysis.
  Consult it BEFORE the first write or the first large fetch — its guards prevent the
  two failure modes that bite bulk Intercom work: shipping a mis-encoded article body,
  and losing hours of progress to rate limits or context exhaustion.
---

# Bulk Intercom Article Updates — done safely

Bulk-editing Help Center article bodies looks trivial and is not. Two failure modes
recur, and both are silent — you find out from a screenshot days later, not from an
error at write time:

1. **Corruption on write** — a body gets shipped HTML-escaped (`<div>` → `&lt;div`) or
   otherwise mangled, so Intercom renders the raw source as visible text.
2. **Lost progress** — a run of hundreds of fetches or writes dies partway (rate limit,
   timeout, context/token exhaustion) and, without resumability, you start over or, worse,
   half-finish and can't tell which half.

This skill exists to make both un-shippable. Follow the write contract for any change,
and the resume patterns for any large read.

## The golden rules (internalise these)

- **The body is HTML, and `update_article` overwrites the WHOLE body.** There is no patch
  API. Every write replaces everything — so a single bad body loses the entire article.
- **Encode the body as JSON, never build it as a string.** The corruption bug is almost
  always someone letting a body be HTML-escaped or wrapped as plain text. Write
  `{ "body": <html> }` to a file and send it as a JSON payload; never interpolate HTML
  into a command line or a text field.
- **Match articles by ID, never by URL.** Intercom redirects by ID, so the slug in a URL
  drifts (`/12345-old-title` silently becomes `/12345-new-title`). Extract
  `(articles|collections)/(\d+)` and reason about the number.
- **Existence is not completeness.** A saved body file can be truncated, not just missing.
  A "verified: true" log line means nothing if the verify step never ran.
- **"Clean" means verified clean, not unreached.** Always separate checked-clean,
  checked-broken, and unchecked. Silent truncation of coverage is the worst outcome for
  an audit — it reads as "all good" when it isn't.

## Workflow

Most bulk jobs are: **inventory → fetch bodies → analyse/decide → apply → verify.**
Reads and writes have different risks, so they have different guards.

### Reading at scale (inventory + fetch)

When you must pull many article bodies (e.g. to audit or search them), follow
`references/bulk-read-and-resume.md`. The essentials:

- **Build an inventory by ID**, keeping `{id, state, url, title, parent_ids}`. A draft
  article has `url: null` — that is your cheap published/draft signal.
- **Fan out with subagents, and keep bodies out of the main context.** Article bodies are
  large; pulling hundreds inline will exhaust your context. Delegate fetching to subagents
  that write each body to disk and return only counts + IDs.
- **Make every fetch resumable by existing-file skip** — write `bodies/{id}.html` the moment
  it arrives, and skip any id already on disk on re-run. Now you can kill and restart freely.
- **Guard against truncation** with a size-aware refetch pass: compare each on-disk body
  against its expected `size` from the inventory and refetch anything below ~90%.
- **Never let one bad article abort the run** — wrap each fetch, log failures to a file,
  keep going. Report the failures so nothing fails silently.

### Writing at scale (apply + verify)

This is where corruption happens. Use the guarded write path — do not hand-roll writes.
The reference implementations are in `scripts/` (Node, using the `intercom` CLI); the full
contract and the post-mortem that motivates it are in `references/write-safety.md`.

Every write MUST clear four guards:

1. **Back up first (mandatory).** Fetch the article and save its full payload (body + title
   + state + parent) to `backups/<run>/<id>.before.json` before touching it. No backup on
   disk → no edit. This is your complete, per-article rollback.
2. **Pre-write encode guard.** Before sending, run `bodyLooksSafe()` (`scripts/guard_lib.mjs`):
   refuse any body that opens with an escaped tag or carries a run of `&lt;tag`. This catches
   the mis-encoding *before* it reaches Intercom.
3. **Write via JSON, then verify against the re-fetched stored body.** Re-`get` the article
   and assert: not escaped, the intended change is present, state unchanged. Verify against
   the API's stored body, **not** the public page — the public page is CDN-cached and lags a
   fresh write by minutes, so it will lie to you.
4. **Log every write, and reconcile the run.** Each writer appends a mandatory log line
   (`{id, applied, skipped, verified}`). If writers run in parallel, each writes its OWN log
   file — parallel appends to one file race and drop lines. Afterwards, reconcile: every
   planned article must appear in a log AND pass the escape-check. A planned article with no
   log line is a hard failure — that missing line is exactly how corruption slips through
   unnoticed.

Two more rules that prevent whole-article damage:

- **Per-op independence.** When applying several edits to one article, apply each edit only
  if its target (e.g. `href="OLD"`) is still present; skip the ones already gone rather than
  aborting the article. A teammate may have fixed a sibling link since your audit — an
  all-or-nothing write would either clobber their fix or leave real problems unfixed.
- **Text substitutions must stay inside text nodes.** If you are replacing words (e.g. a
  terminology fix), never let the replacement fire inside a tag, attribute, or `href` slug —
  you will corrupt links while "fixing" prose. Detect and skip anchors/attributes.

## The scripts (reusable reference implementations)

In `scripts/` — Node ESM, driven by the authenticated `intercom` CLI. They assume a
`change_plan.json` of the shape `{ "edits_by_source": { "<id>": [ {op, href, new_url} ] } }`
and a `backups/<run>/` directory. Adapt the plan shape to your job; keep the guards.

- **`guard_lib.mjs`** — shared: `getArticle`, `isCorrupted` (the escape signature), and
  `bodyLooksSafe` (the pre-write guard). Start here; the guard predicate has a tunable
  threshold you should set to your content reality (see its comments).
- **`apply_edit.mjs`** — the deterministic guarded write path: back up → apply in code →
  pre-PUT guard → JSON write → re-fetch verify → mandatory per-article log. Always
  `--dry-run` first.
- **`verify_run.mjs`** — the run reconciler: every planned source must be logged AND pass
  the live escape-check, or it exits non-zero. Run it before you call a job done.
- **`detect_corruption.mjs`** — standalone escape-check gate over any set of ids (or
  `--from-backups` for everything you have ever written); exits non-zero on any escaped body.
  Read-only; run it any time as a smoke test.

## When things go wrong

- **A body shipped corrupted:** restore from `backups/<run>/<id>.before.json` (or the correct
  intended `.after.html` if the *computation* was fine and only the *write* broke — that keeps
  the intended change). Re-fetch and confirm it renders.
- **A run died mid-way:** just re-run it. If you built for resume (existing-file skip on reads,
  per-op independence + backups on writes), re-running never double-does work and picks up where
  it stopped.
- **You're not sure what's broken:** run `detect_corruption.mjs --from-backups` — it checks every
  article you have ever written against the live state.

## Deeper references

- `references/write-safety.md` — the full write contract, the guard internals, and an
  anonymised post-mortem of the corruption bug this skill was built to prevent.
- `references/bulk-read-and-resume.md` — inventory, subagent fan-out, resume, truncation
  detection, rate-limit and token-exhaustion survival.
- `references/api-gotchas.md` — Intercom CLI/API quirks that silently break bulk jobs
  (broken pagination, search not indexing links, no collections endpoint, cross-workspace ID
  collisions, swallowed error bodies).
