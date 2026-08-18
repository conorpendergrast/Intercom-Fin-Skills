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
