# Known failure patterns

These are generic *shapes* of failure that tend to recur across data
connectors and across workspaces — recognising the shape saves you from
re-diagnosing the same root cause from scratch every time it resurfaces on a
different connector. None of the specifics below are tied to any real
workspace; treat every example as illustrative.

## Auth/permission rejections (the identity doesn't authenticate)

**Signature:** an HTTP 401 (or workspace-equivalent) with an error message
along the lines of "invalid or missing user credentials," where the
connector's own logic looks correct — the request URL and body are properly
formed, they're just being rejected by the backend it's calling.

**Common root causes, in roughly the order to check them:**
- The identity Fin passed doesn't resolve to a real account on the backend
  side — a guest identity being used against a host-scoped endpoint, a
  teammate identity where the endpoint expects an owner, or similar
  role/endpoint mismatches.
- A genuinely inactive or lapsed account (subscription cancelled, trial
  expired) where the rejection is actually correct behaviour, not a bug.
- **The trap:** don't assume every instance is (2). Read the actual
  conversation before concluding "cancelled account, correctly rejected,
  nothing to do." Billing-state mismatches between what your support
  platform's contact attributes show and what your billing system's source
  of truth says are common — a contact attribute can say `active` while the
  real subscription state (governing the API) has lapsed, or vice versa.
  When in doubt, treat the contact attribute as unreliable and look for
  independent confirmation before writing off a 401 as "expected."
- If the same failure signature starts appearing on *previously-fine*
  accounts (active, paying, not just guests or trials), that's a strong
  signal it's graduated from an edge case to a real bug worth escalating —
  track this shift explicitly when you see it.

## Request-validation gaps (fails before it even calls out)

**Signature:** the request never reaches the backend at all — `http_status`
is `null`, `success` is `false`, and `error_type` is something like "Request
validation error" with a message like "Request is missing required
parameters." Both `request_url` and `request_body` are typically also
`null` in the log, because Intercom rejected the call before building it.

**Root cause:** almost always a connector input that isn't being populated
correctly for a specific trigger path — a parameter that's supplied for one
entry point into a Procedure but not another, or a default/placeholder value
("use 0 when you don't have this yet") that was meant for a different field
and leaked into a required one. If you see this exact signature recur on
multiple *different* connectors around the same time, it's often the same
underlying input-population template or shared instruction snippet copied
across several connector configs — check whether they share a boilerplate
instruction, not just similar symptoms.

## Timeouts

**Signature:** `http_status: 0`, an execution time at or near your
platform's hard timeout ceiling (commonly ~30 seconds), `error_type` like
"HTTP client error," empty response body.

**What to check:** whether the automation layer (Fin, or whatever's calling
the connector) retried and, if so, whether it told the customer anything
went wrong versus failing silently. A well-behaved failure here still
escalates cleanly to a human — the thing actually worth auditing is what
happens *after* the escalation: did a human actually pick it up in a
reasonable time, or did the customer sit in a queue with no further
response? A connector-level timeout that's handled gracefully but followed
by hours of silence downstream is a staffing/SLA problem wearing a
connector-bug costume — report it as such, separately from the timeout
itself.

## Low-sample latency false positives

**Signature:** a connector shows `overall_status: degraded` despite a
`success_rate` of 100%, usually on a very small number of executions (often
just one).

**Root cause:** most health-status calculations flag a connector as
degraded purely on elevated latency percentiles, and a single slow call is
enough to trip that on a low-volume connector even though nothing actually
failed. This is very likely noise, not a real issue — don't spend
investigation time chasing a "degraded" flag with `success_rate: 1` and
`total_executions` in the single digits unless it persists across multiple
checks.

## Empty-but-successful responses

**Signature:** `http_status: 200`, `success: true`, but the response body is
an empty array/object where the customer's question implies there should
have been real data (an empty task list, an empty history, a null status).

**What to check before assuming it's a bug:** whether the question actually
implied data should exist. A customer asking a purely conceptual "how does
this feature work?" question can trigger a connector built for
record-specific lookups and legitimately get nothing back — that's a mismatch
between what fired and what was asked, not the connector failing. It becomes
a real concern when the customer clearly expects specific data to exist (they
named a specific record, amount, or date) and still gets an empty result —
that's worth escalating as a genuine data-availability or matching bug.
