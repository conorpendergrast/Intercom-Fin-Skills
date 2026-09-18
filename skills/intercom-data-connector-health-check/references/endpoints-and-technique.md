# Endpoints and batching technique

## Why this has to run through a browser, not the API or CLI

Data-connector health metrics live behind Intercom's authenticated product UI
at `app.intercom.com`. As of writing, they are not exposed by the public
Intercom API, and the Intercom CLI's connector commands only return
config-level fields like `state` — no execution counts, success rates, or
failure logs. That means this workflow requires a real, logged-in browser
session (e.g. via Claude in Chrome or an equivalent browser-automation tool)
that can make same-origin `fetch()` calls from an `app.intercom.com` tab. A
headless cron job or a plain API client cannot do this part.

If you're using a browser-pairing tool that can connect to multiple browser
profiles, always confirm you're on the right one explicitly (by whatever
stable identifier the tool gives you) rather than by display name — display
names can be ambiguous or change between sessions.

## The endpoints

All of these are same-origin `fetch()` calls made from within a page already
on `app.intercom.com/a/apps/<app_id>/...`, with `credentials: 'include'` so
the browser's existing session cookie authenticates the request. Replace
`<app_id>` with your workspace's slug throughout.

**List all connectors:**
```
GET /ember/workflow_connector/actions?app_id=<app_id>
```
Returns an array (or `{ actions: [...] }`) of connector objects. The fields
you care about most: `id`, `name`, `state` (`live` / `draft`), `usage`
(`fin`, `workflow_and_inbox`, or others — only `fin` means Fin itself can
call it), `description`, `url` (the underlying API endpoint it hits),
`created_at`, `updated_at`.

**Health metrics for one connector:**
```
GET /ember/workflow_connector/actions/<id>/health_metrics?lookback_hours=<N>&app_id=<app_id>
```
`N` is typically `24`, `48`, or `168` (7 days) — note the UI's own date
picker usually only exposes 24h and 3d/7d presets, skipping 48h; the endpoint
will give you an exact 48h window even though the UI won't. The response's
`.summary` includes `overall_status` (`healthy` / `degraded` / `unhealthy` /
`null` when there were zero executions), `total_executions`, `success_rate`,
latency percentiles (internal and external, typically p50/p90/p99),
`http_status_distribution`, and `failure_types_distribution`.

**Failure/execution log for one connector:**
```
GET /ember/workflow_connector/action_execution_results?action_id=<id>&page=<p>&created_at=<hours>&app_id=<app_id>
```
Returns `{ action_execution_results: [...] }`, paginated (roughly 20 per
page). Each entry has `error_message`, `error_type`, `http_status`,
`response_body`/`raw_response_body`, `request_body`, `conversation_id`,
`user_id` (the Intercom contact ID), `success` (boolean — use this to filter,
not just non-200 status, since some failures return `http_status: null` when
they fail validation *inside* Intercom before ever calling out), and `id`
(the execution's own ID). Keep pagination loops small — well under 10 pages
per call — or a browser-automation JS-exec tool may hit its own timeout
before the fetch loop finishes.

## Don't leave the response bodies on the table

This endpoint is easy to think of as "the failure log" and fetch only when
something is already degraded. It is not — it is the **execution** log, it
returns successful calls too, and `response_body` / `raw_response_body` carry
**the actual payload the connector returned**, paired with the
`request_body` that asked for it.

That matters more than anything else in this file, because the conversation
audit's biggest blind spot is "the call succeeded and I cannot see what came
back." The transcript genuinely does not show you the payload — but this
endpoint does, and it is the same fetch you are already making. Pull bodies
for every watch-item execution in your window **before** you read a single
transcript:

```js
const rows = await logs(connectorId, 24);  // the paginated fetch above
rows.forEach(r => {
  const body = r.raw_response_body || r.response_body || '';
  const req  = r.request_body || '';
  // group by r.conversation_id; note which calls returned real data
  // and which returned an empty collection
});
```

Two questions this answers immediately, neither of which a transcript can:

- **Was the payload empty?** An empty collection is a *correct negative* for
  a record that genuinely has nothing to return, and it explains at a stroke
  why a reply cited nothing specific. Without this you will record
  "unverifiable" and, worse, may write up "the connector's output never
  reaches replies" when the truth is there was no output to reach them.
- **What identifier was actually queried?** `request_body` shows you whether
  repeated calls re-queried one identifier (worth a look) or worked through
  several distinct ones (a legitimate batch), and whether the identifier Fin
  used was one the customer actually supplied.

A payload also satisfies the corroboration bar in
`references/falsification.md` on its own, so pulling bodies first converts
verdicts that would have been interpretive into evidenced ones.

## Batching across many connectors

A workspace can easily have 50–100+ connectors. Fetching health metrics for
all of them one at a time is slow and, if done in a tight serial loop, can
trip rate limiting. Use a small worker-pool pattern inside the browser JS
context instead of `Promise.all` over everything at once or a plain `for`
loop:

```js
const connectors = /* the list from step 1 */;
const results = new Array(connectors.length);
let idx = 0;
async function worker() {
  while (idx < connectors.length) {
    const i = idx++;
    const c = connectors[i];
    const r = await fetch(
      `/ember/workflow_connector/actions/${c.id}/health_metrics?lookback_hours=24&app_id=<app_id>`,
      { credentials: 'include' }
    );
    const j = await r.json();
    results[i] = { id: c.id, name: c.name, state: c.state, summary: j.summary || j };
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
```
A concurrency of around 6 is a reasonable default — enough to be fast, not so
much you get throttled.

## Building and retrieving a CSV from a long browser session

Once you've fetched everything, build the CSV *inside* the browser JS
context (so you're not round-tripping large objects back through your
automation tool) and stash it on `window`:

```js
window.__csv = rows.join('\n'); // rows built as usual, header first
```

Many browser-automation JS-exec tools truncate a single call's returned
output at roughly 1,000–1,200 characters. If your CSV is longer than that
(it usually is, past a couple dozen connectors), retrieve it in slices from
subsequent calls in the *same* tab/session:

```js
window.__csv.slice(0, 1000)
window.__csv.slice(1000, 2000)
// ... and so on until you've covered window.__csv.length
```

`String.prototype.slice` with fixed, contiguous boundaries always reconstructs
the original string exactly when concatenated — the pieces can look like
they cut mid-word or mid-row, but that's just how it renders in each
individual tool response; it isn't evidence of a gap. Don't second-guess the
boundaries once they're contiguous and cover the full length; just
concatenate and save.
