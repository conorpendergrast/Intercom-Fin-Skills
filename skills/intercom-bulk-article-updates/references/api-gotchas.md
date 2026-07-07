# Intercom CLI / API gotchas that silently break bulk jobs

These are the quirks that don't error — they just quietly give you wrong or partial results,
which is how a bulk job produces a confidently wrong outcome. Verify counts before trusting any
sweep. (Observed against the `@intercom/cli` and the Articles API / MCP; re-check against your
version, since some are server-side and a client upgrade won't fix them.)

## Reads / inventory

- **`articles list --paginate` can emit zero bytes.** The documented pagination flag on the
  high-level `articles list` command may produce *no output at all* — not an error, just an empty
  stream — while the same command without `--paginate` silently returns only the first page (~25
  articles). An audit that trusts this operates on 25 articles and thinks it saw everything.
  **Workaround:** use the raw API passthrough, where pagination works: `intercom api /articles
  --paginate --json`. General rule: when a high-level command behaves oddly (empty/partial
  output), fall back to the Articles MCP (`list_articles` / `get_article`) or the raw `intercom
  api` passthrough, and validate counts before trusting the result.

- **`search_articles` does not index `href` attribute values.** A phrase search matches visible
  body text + titles only, not the contents of link `href` attributes. Searching for a URL
  substring returns only the articles where that URL is *visible link text*, missing every
  article that links there under friendly anchor text. **You cannot prefilter articles by what
  they link to** — a dead-link or migration audit must `get` every body and parse the HTML.

- **No collections endpoint in the Articles MCP.** You can list/get/search articles, but there is
  no way to enumerate collections. Links of the form `/collections/{id}` can't be resolved against
  an inventory — fall back to a live `curl` of the public collection URL to check them.

- **Drafts have `url: null`.** The cheap published/draft signal in the article list. A draft
  target 404s for the public.

## Cross-workspace ID collisions

- Internal links may use both the current custom domain (`help.yourbrand.com/en/articles/{id}-…`)
  and the legacy `intercom.help/<your-workspace-slug>/en/articles/{id}-…`. Both resolve against
  *your* inventory. But `intercom.help/<other-slug>/…` is a **different workspace** whose article
  IDs are unrelated to yours — resolving those against your inventory produces false "deleted"
  findings. **Scope the legacy domain to your own workspace slug;** treat every other
  `intercom.help/<x>/` as external.

- **Match on the extracted ID, never the full URL.** Intercom redirects by ID, so the slug drifts
  (`/12345-old-title` → `/12345-new-title`). Extract `(articles|collections)/(\d+)` and compare
  numbers. URL-string matching manufactures false positives. Bare-id links (`/en/articles/12345`,
  no slug) and anchored links (`/en/articles/12345-slug#h_abc`) both occur — the ID regex handles
  both.

## Writes / errors

- **`update_article` overwrites the WHOLE body.** No patch API. See `write-safety.md`.

- **Error responses may swallow the body.** On a failed request the CLI can print only
  `Error: HTTP 422` and discard the response body — which is where the actual validation detail
  lives. If you need to see why a write failed, capture the raw HTTP response (e.g. via the API
  passthrough or by inspecting `fetch`), since the friendly error text often omits the real
  `{"error": "..."}` payload.

## The meta-rule

Every one of these fails *silently* — empty output, partial pages, unmatched searches, false
positives, swallowed errors. None throw. So the defence is the same each time: **validate counts
and spot-check raw output before trusting a sweep.** Reviewing the raw findings before acting is
where these get caught.
