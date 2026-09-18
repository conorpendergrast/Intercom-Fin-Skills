# Connector health state file — template

This is the file you keep **outside this repo**, one per Intercom workspace,
at a conventional location such as:

```
~/.intercom-connector-health/<app_id>.md
```

Using a fixed, predictable location (rather than an ad-hoc note or a memory
store) means the skill can find it, read it, and update it on every run
without you having to re-explain where things live each time. Since it lives
outside the repo, there's no risk of it accidentally getting committed to
this public repo.

Copy the structure below for a new workspace and fill it in as you go.

---

```markdown
# Connector health state — <workspace name>

- **app_id**: <slug from app.intercom.com/a/apps/<app_id>/...>
- **Browser pairing**: <note on which browser-automation pairing/profile is
  set up for this workspace, if your tooling needs one re-established per
  machine>
- **Last full inventory run**: <date>

## Connector ID → name/purpose

| Connector ID | Name | Purpose | Notes |
|---|---|---|---|
| conn_123 | Order Status Lookup | Checks order status by order number | |

## Expected behaviour (what is *not* a finding)

Connectors whose firing pattern looks anomalous but is by design — a
best-effort repair, a pre-fetch, anything built to fire speculatively.
Checklist item 4 in `references/falsification.md` reads this table before
calling a pattern a bug. Add a row every time you dismiss a finding on these
grounds; the table starts empty and is only worth having if filling it is
part of the run.

| Connector ID | Expected behaviour | Not a finding | Still a finding |
|---|---|---|---|
| conn_456 | Best-effort repair, fires speculatively on every record touch | Unrequested or undisclosed calls; high call volume | Returns success but changes nothing, and the automation then tells the customer no action is needed |

## Watch items (newly launched / under closer scrutiny)

Connectors here get every conversation audited, not a sample, until
graduated back to steady-state monitoring.

| Connector ID | Name | Watch started | Status | Graduation criteria |
|---|---|---|---|---|
| conn_123 | Order Status Lookup | 2026-08-01 | Watching | 2 weeks of "helped" verdicts on >90% of conversations |

## Running findings log

Reverse-chronological. One entry per notable finding from a conversation
audit — keep customer/account specifics here, not in the public repo.

### 2026-08-15 — conn_123 Order Status Lookup
- Verdict: mixed. Correct data returned but Fin quoted stale status in 2/8
  conversations this week.
- Conversation links: <deep links>
- Action: flagged to connector owner, re-checking next week.

## Locally observed failure signatures

Patterns you've seen here that aren't (yet) generic enough for
`references/known-failure-patterns.md`, or are still specific to this
workspace's setup.

- <date> — <signature> — <what it turned out to be>
```
