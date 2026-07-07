# Write safety — the full contract, guard internals, and post-mortem

The single most dangerous operation in bulk Intercom work is writing an article body.
`update_article` / `PUT /articles/{id}` overwrites the **entire** body (there is no patch
API), so a single mis-encoded write destroys the whole article, and Intercom accepts it
without error. You find out later, from a screenshot.

## Contents
- [Post-mortem: how a whole body shipped escaped](#post-mortem)
- [The four write guards](#the-four-write-guards)
- [Guard internals](#guard-internals)
- [Restore / rollback](#restore)

## Post-mortem

**Symptom.** A published article suddenly rendered its own raw HTML as visible text — the
page showed `<div class="...">` and `&lt;p&gt;` literally instead of formatted content.

**What actually landed.** The stored body was the whole intended HTML, but **HTML-escaped
and wrapped in a single `<p>`**: every `<` had become `&lt;`, every `>` `&gt;`. Intercom,
handed what looked like plain text, wrapped and escaped it — so the source rendered as text.

**Root cause.** The edit was computed correctly (the intended `.after.html` was clean, valid
HTML). The bug was in the **write**: the body was sent through a path that HTML-escaped it
instead of being sent as a raw-HTML JSON string. Sending `{ "body": "<div>…" }` as JSON is
correct — JSON escaping keeps `<div>` as `<div>`. Letting the HTML pass through a text field,
a template, or a shell interpolation is what escapes it.

**Why it shipped unnoticed.** The run used two parallel writers. One wrote its log and verified
each article. The other handled a single article, **wrote no log line, and never ran the verify
step** — so the escape sailed through. "5 of 6 done" was reported; it was really 5, plus one
silently broken. The missing log line was the tell that nobody was looking for.

**The two lessons, generalised:**
1. A body must be sent as a JSON string, never assembled or escaped as text.
2. A write you didn't verify didn't happen. A verify nobody can see (no log) didn't happen.
   Reconcile planned-vs-logged so a silent omission is a loud failure.

## The four write guards

Every write clears all four. `scripts/apply_edit.mjs` implements them; if you ever must write
by hand, replicate them.

1. **Back up first (mandatory).** `get` the article and save the full payload — body, title,
   state, parent_id/parent_type — to `backups/<run>/<id>.before.json`. No edit happens for an
   article until its backup exists. This is the complete rollback.

2. **Pre-write encode guard.** Run `bodyLooksSafe(body)` before sending. It rejects a body that
   is empty, has no real HTML tags, opens with an escaped tag, or carries more than a few
   `&lt;tag` sequences. This stops the mis-encoding *before* it reaches Intercom, which is far
   better than detecting it after.

3. **Write via JSON, then verify against the re-fetched stored body.** Write `{ "body": <html> }`
   to a file and send it as the request body (e.g. the CLI's `--input`). Then re-`get` and assert:
   - the body is **not** escaped (`isCorrupted` is false),
   - the intended change is present (new href present / old gone; corrected text present),
   - `state` is unchanged.
   Verify against the **API's stored body**, not the public URL — the public page is CDN-cached
   and lags a write by minutes, so a fresh, correct edit can look like "no change" on the live
   page for a while. Trust the stored body.

4. **Log every write; reconcile the run.** Append `{id, ops_applied, ops_skipped, verified, …}`
   per article. Parallel writers each write their OWN log file — concurrent appends to one file
   race and drop lines. Afterwards run the reconciler: every planned source must appear in a log
   AND pass the live escape-check, or the run is not done.

## Additional whole-article safeguards

- **Per-op independence.** Applying several edits to one article: apply each op only if its
  target string is still present; skip (don't abort) ops whose target is already gone. Content
  drifts between audit and apply — a sibling fix by a teammate shouldn't cause you to clobber
  their work or bail on the remaining real fixes. If *all* ops for an article are already gone,
  skip the article entirely (no-op, no write).

- **Text substitutions stay in text nodes.** Replacing words (terminology fixes, rebrands) must
  never fire inside a tag, an attribute value, or an `href` slug — you would corrupt links and
  markup while "fixing" prose. Strip/skip anchors and attributes before matching, and after the
  write verify that the anchor/attribute structure is unchanged, not just that the word changed.

## Guard internals

The corruption signature (`isCorrupted` / `ESCAPE_SIG` in `guard_lib.mjs`) matches HTML tags
appearing **escaped as literal text** — `&lt;div`, `&lt;p `, `&lt;a `, `&lt;h1`…`&lt;h6`,
`&lt;ul`, `&lt;li`, `&lt;/`. A correctly authored body holds real tags (`<div>`), never these
escaped literals in bulk, so the signal is clean.

The pre-write guard (`bodyLooksSafe`) is deliberately stricter and has a **tunable threshold**
(`MAX_ESCAPED_TAGS`, default 3). The trade-off is yours to set:
- **Too strict** → false-rejects a legitimate article that shows escaped tags in a code sample
  (e.g. a doc literally teaching `&lt;div&gt;`).
- **Too loose** → lets a fully-escaped body through, which is the incident.
If your Help Center contains articles that legitimately display escaped markup, raise the
threshold or special-case those ids; otherwise the default is safe.

## Restore

For any affected id, read `backups/<run>/<id>.before.json` and write the saved `body`, `state`,
`title`, and `parent_id`/`parent_type` back to restore it exactly. If the *computation* was fine
and only the *write* corrupted it, restore the intended clean `.after.html` instead — that undoes
the corruption **and** keeps the change you meant to make. Re-fetch afterwards and confirm it
renders. The backups plus the apply logs are, together, a complete per-article rollback.
