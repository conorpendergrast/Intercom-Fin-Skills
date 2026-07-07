# Bulk reads, resume, and surviving rate limits & context exhaustion

Pulling a whole Help Center's bodies for an audit is a long, interruptible job. The goal is
that **any interruption costs you nothing** — kill it, hit a rate limit, run out of context,
come back, re-run, and it picks up exactly where it stopped. Build for that from the start;
retrofitting resume onto a half-finished run is painful.

## Contents
- [Build an inventory by ID](#inventory)
- [Fan out with subagents; keep bodies out of context](#fan-out)
- [Resume by existing-file skip](#resume)
- [Truncation: existence is not completeness](#truncation)
- [Rate limits and failures](#rate-limits)
- [Delta refetch and cross-project cache reuse](#delta)
- [Coverage honesty](#coverage)

## Inventory

Paginate the article list and keep only `{id, state, url, title, parent_ids, size}` per
article. Two cheap signals fall out of this:
- **Published vs draft:** a draft has `url: null`. A draft target 404s for the public, so for
  link-audit purposes it counts as dead.
- **Expected body size:** the `size` field is what you diff on-disk bodies against to catch
  truncation (below).

Delegate the paginated list to a subagent so the bulky responses don't fill your context; have
it return just the counts and the id list.

## Fan out

Only a per-article `get` returns the HTML body, and bodies are large. Fetching hundreds inline
will **exhaust your context / token budget** — the second big failure mode. Instead:

- **Slice the id list** into N slices and fan out subagents (a cheaper model like Sonnet is
  fine for pure fetching; a top model burns budget on hundreds of large bodies).
- Each subagent **writes each body straight to `bodies/{id}.html`** and returns only counts +
  any failures — never the body text. The body is data on disk, not context.
- This keeps the orchestrator's context small and the job parallel.

## Resume

The core resume mechanism is dead simple and robust: **write each output the instant you have
it, and skip anything already on disk on re-run.**

- Each body → `bodies/{id}.html` immediately.
- `needs_fetch(id)` returns false if the file already exists → skipped on re-run.
- Kill and re-run freely; it continues from where it stopped. Every task is idempotent because
  all outputs are on-disk files, so re-running never double-does work.

## Truncation

**Existence is not completeness.** A `get` response can be cut off mid-stream, landing a
valid-looking but partial body on disk (e.g. a 480-byte file where the real article is 12 KB —
the whole table silently gone). The existing-file skip above catches *missing* bodies but not
*truncated* ones, so a naive resume under-reports.

Guard with a **size-aware refetch pass** before you trust the corpus:
- Record each article's expected full size (the `size` from the inventory, or a second `get`'s
  `len(body)`).
- Diff it against the on-disk file; refetch anything below ~90% of expected.
- The refetch is itself resumable (skip ids already at full size).
- Note: some articles are legitimately short (edited down at source). Those stay small on
  refetch and settle — don't chase them forever.

## Rate limits

- **Don't disable retries.** The Intercom CLI auto-retries 429 with backoff by default; leave
  that on and set a generous `--timeout`. In practice a well-paced sweep of several hundred
  fetches often sees **zero** 429s, but build for them anyway.
- **One bad article never aborts the run.** Wrap each fetch in try/except, log the failure to a
  `fetch_failures.txt`, and continue. Report that file at the end so failures are visible, not
  silent.

## Delta

Re-running an audit later shouldn't refetch everything:
- **`updated_at > file mtime`** means the article was edited since your snapshot → refetch just
  those (plus genuinely new ids). This shrinks a re-run to a small delta.
- **Reuse a body cache across projects.** If a sibling audit already pulled the same Help
  Center's bodies, point at its `bodies/` and only fetch the delta. A second audit of the same
  workspace can reuse almost the entire corpus.

## Coverage

Report coverage honestly, always split three ways: **checked-clean / checked-broken / unchecked
(fetch failures).** "Clean" must mean *verified* clean, not *unreached*. A sweep that silently
operates on a truncated corpus and reports "all good" is the worst failure mode for an audit —
it manufactures false confidence. State the numbers: e.g. "710/710 bodies checked, 0 unchecked."
