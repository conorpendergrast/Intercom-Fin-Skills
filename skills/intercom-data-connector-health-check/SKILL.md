---
name: intercom-data-connector-health-check
description: >
  Audit the live health of Intercom Fin data connectors — and, more importantly,
  whether they actually help customers, not just whether the HTTP call succeeds.
  Use this skill whenever someone asks to "check data connector health", "run
  the connector health check", "audit Fin connectors", "is my data connector
  working", "why is a connector degraded/unhealthy", wants to add a newly
  launched connector to closer monitoring, or asks whether a "successful"
  connector call actually resolved a customer's question. Also trigger on
  "watch item connector", "has this connector graduated", or investigating a
  spike or drop in a connector's execution volume. Consult it BEFORE pulling
  health metrics from Intercom's UI-only endpoints — the technique (batched
  fetches, output-truncation workarounds, conversation-level auditing via
  subagents) isn't obvious, and checking `success_rate` alone misses the
  failure mode that matters most: the call succeeds, but the answer is wrong.
  Every run of this skill ends by publishing a single self-contained,
  actionable HTML report (priority actions first, then per-connector detail)
  — not just a chat summary.
---

# Intercom Fin data-connector health check

A data connector's `success_rate` tells you whether the HTTP call worked. It
tells you nothing about whether Fin actually used the response to help the
customer. A connector can be 100% "healthy" by every metric Intercom surfaces
and still be quietly giving customers wrong or generic answers on every call —
that gap is what this skill exists to close.

## The core problem this skill solves

Intercom's connector health dashboard is UI-only — there's no CLI or public
API for it — and even once you can pull the metrics, they only prove the
*call* succeeded, not that the *answer* was good. Two failure modes hide
behind a green "healthy" status:

1. **Fin misinterprets good data.** The connector returns correct data, but
   Fin draws the wrong conclusion from it, or gives a contradictory answer
   across repeated calls in the same conversation.
2. **Fin ignores good data.** The connector returns something, but Fin's
   reply is generic boilerplate that never references what came back — you
   can't tell from the transcript alone whether the data was bad or Fin just
   didn't use it (see "the unverifiable middle" in
   `references/conversation-audit-methodology.md`).

Health metrics alone will never catch either. You have to read the actual
conversations.

## Prerequisites

- An authenticated browser session on the Intercom workspace, via a browser
  automation tool such as Claude in Chrome. There is no way to pull health
  metrics headlessly — see `references/endpoints-and-technique.md` for why,
  and for the exact endpoints and a batching pattern that works around
  Intercom's per-request pagination and payload limits.
- Your workspace's `app_id` (the slug in your Intercom URLs, e.g.
  `app.intercom.com/a/apps/<app_id>/...`).
- A local state file for this workspace, kept **outside this repo**. **This
  skill is written to be workspace-agnostic on purpose — see "Keep
  client-specific data out of this skill" below before you run it against a
  real workspace.**

## Workflow

### 0. Load or create your local state file

Every run reads from and writes to a plain markdown file, one per workspace,
at a conventional location such as `~/.intercom-connector-health/<app_id>.md`
— not this repo, and not a memory/notes system, since the point is a single
predictable file the skill itself owns and updates every run. If it doesn't
exist yet, create it from `references/state-file-template.md`. It holds the
`app_id`, your connector ID→name/purpose mapping, current watch items, and
the running findings log — use it to pick up where the last run left off
(what's already a watch item, what's already been triaged) rather than
starting cold.

### 1. Pull the full connector list and 24h health for all of them

Fetch every connector's `id`/`name`/`state`, then fan out health-metric
requests across all of them with a small concurrency pool (Intercom will
throttle a fully serial loop into uselessness, and a fully unbounded one into
rate limits). Exact endpoints, request shapes, and the JS-tool output-slicing
workaround for building a CSV from a long-running browser session are in
`references/endpoints-and-technique.md` — read that before writing any fetch
code.

Save the result as a CSV. This gives you a point-in-time inventory: which
connectors are `draft` vs `live`, which have `usage: fin` (Fin can actually
call them) vs some other usage type, and which tripped `degraded` or
`unhealthy` in the lookback window.

### 2. Triage what's unhealthy — but don't stop at the metric

For anything degraded/unhealthy, pull its failure log and read the actual
`error_message`/`error_type`/`http_status` on each failure — not just the
aggregate rate. Failure signatures repeat across connectors and across weeks;
`references/known-failure-patterns.md` catalogues the generic shapes worth
recognising (auth/permission rejections, request-validation gaps, timeouts,
and the specific "flagged degraded on a single low-latency sample" false
positive that isn't worth chasing). Match what you see against that list
before assuming a new bug — and log genuinely new patterns in your local
state file's "Locally observed failure signatures" section so you (or
whoever runs this next) recognise them faster next time.

### 3. For any connector under closer scrutiny, audit real conversations

This is the part that actually distinguishes "the API call worked" from "this
helped a customer." Full methodology, including the verdict taxonomy (helped
/ mixed / not helped / unverifiable) and how to fan the reads out to
subagents so long transcripts don't blow your context budget, is in
`references/conversation-audit-methodology.md`. The short version:

- Get the distinct conversation IDs the connector fired in during your
  window — not the raw execution count, which can hugely overstate distinct
  customer impact if one conversation looped the connector many times.
- Read each conversation (or fan reads out to subagents in parallel once you
  have more than a handful) and answer, for each one: did Fin's reply
  actually reference specific data the connector returned, was that data
  correct, and was the customer's problem actually resolved — not just was
  the HTTP status 200.
- Always report per-conversation with deep links back into Intercom, not just
  aggregate counts. A number without a way to go look at the transcript isn't
  actionable.
- Record each notable finding in your local state file's running findings
  log as you go, and check it first for what's already been triaged on a
  repeat run — that's what keeps a second pass from re-litigating the same
  conversations.

### 4. Track newly launched connectors as "watch items"

A connector someone just built deserves closer attention than the steady-state
inventory scan — usually every conversation it fires in, not a sample, until
its behaviour is established. Two things to check before you even start
auditing conversations, because they're common false starts:

- **`state`**: a connector sitting in `draft` will never fire for Fin, no
  matter how thoroughly it's configured. Confirm it's `live`.
- **`usage`**: a connector can be `live` but scoped to `workflow_and_inbox`
  rather than `fin` — meaning Fin still can't call it. Confirm `usage: fin`
  before expecting any executions at all.

Once it's actually firing, apply the full per-conversation audit from step 3
to every conversation, not a sample, until whoever owns the connector is
satisfied it's behaving well enough to fold back into normal steady-state
monitoring ("graduated"). Add it to the "Watch items" table in your local
state file when you start watching it, and update its status/graduation
criteria as the audit progresses — that table is what tells a future run
which connectors still need the full treatment.

### 5. Publish an actionable report every run — not just a chat summary

Every run of this check should end with a single self-contained HTML report,
not just prose in the conversation. A findings list buried in chat gets lost;
a page someone can scan, share, and click through to the actual conversations
sticks around. Structure it so the fixes are the headline, not an
afterthought:

- **Priority actions first**, ranked by severity, each with what happened,
  a concrete recommendation, and deep links — not a wall of raw metrics.
- **Connector status** for whatever's actually degraded/unhealthy.
- **One table per watch item**, one row per conversation, with the verdict
  taxonomy from step 3 shown as an at-a-glance pill, not prose.
- A visible callout wherever "unverifiable" dominates a table, so nobody
  mistakes a blind spot for a clean bill of health.

`references/report-template.md` has a ready-to-adapt HTML/CSS template
(self-contained, light/dark aware, no build step) plus a short worked
example — reuse its structure rather than reinventing the layout each time.
If your environment can publish HTML pages directly (e.g. Claude Code's
Artifact tool or Claude.ai), publish it there; otherwise save it as a local
`.html` file next to your CSV output and open it in a browser.

## Keep client-specific data out of this skill

This skill is published in a public repo and deliberately contains no real
workspace slugs, connector IDs, deviceIds, or findings — those are exactly
the kind of detail that shouldn't live in a shared, public file. When you use
this skill against a real workspace, everything client-specific belongs in
your local state file (see "Step 0" above), **outside this repo entirely** —
not gitignored inside it, and not in a general-purpose memory or notes
system. A dedicated file the skill owns is easy to find on the next run, easy
to grep, and there's no ambiguity about what it's for or where it lives:

- Your workspace's `app_id`/slug.
- Any browser-pairing identifier your automation tool assigns (these are
  specific to one browser install and need re-establishing on a new machine
  regardless of where the skill itself lives).
- The mapping of connector IDs to names/purposes you actually care about,
  and which ones are current "watch items."
- Your running findings log — the specific bugs, failure signatures, and
  conversations you've found. Feed genuinely *general* patterns back into
  `references/known-failure-patterns.md` if you think they'd help others, but
  keep the client-identifying specifics (customer names, account IDs,
  conversation contents) in your local state file only.

Use `references/state-file-template.md` to set one up for a new workspace —
copy it to `~/.intercom-connector-health/<app_id>.md` (or wherever you keep
this kind of local state) and fill it in.
