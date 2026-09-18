# Conversation-level audit methodology

## Why `success_rate` isn't the metric that matters

A connector's health metrics can only tell you the HTTP call returned 200 and
some body. They cannot tell you:

- whether that body contained anything useful for the customer's actual
  question,
- whether Fin's reply drew on that body at all, or fell back to generic
  help-article boilerplate,
- whether Fin's interpretation of correct data was itself correct, or
- whether the customer's underlying problem actually got resolved.

All four of those require reading the transcript. Budget for this — it's the
slow, valuable part of a connector audit, not an optional extra.

## Execution count vs. distinct conversations

Always pull the distinct `conversation_id`s a connector fired in, not just
its raw execution count. One conversation can legitimately call a connector
many times in a row — a customer pasting a batch of ten order numbers at
once, for instance, or a long back-and-forth where each new customer message
triggers a fresh lookup. A raw count of "40 executions" might mean 40
distinct customers, or it might mean 3 customers and one conversation that
looped 30 times. Group by `conversation_id` before deciding how much
conversation-reading work you're actually signing up for, and note the
skew — a single outlier conversation with a disproportionate share of calls
is worth understanding on its own (see "same-code retry loop vs. legitimate
batch" below).

## The verdict taxonomy

When you read a conversation, land on one of these for the connector's
contribution to it — this is deliberately more granular than "helped / did
not help," because the "unverifiable" bucket below is common and shouldn't
be quietly collapsed into either extreme:

- **Helped.** Fin's reply visibly cites specific data the connector returned
  (an amount, a status, a date, a name — something that couldn't have come
  from a generic help article), that data was correct, and the customer's
  question was actually answered without escalation, or escalation happened
  for an unrelated reason.
- **Mixed / data right, delivery wrong.** The connector returned correct,
  specific data, but Fin's use of it fell short in some other way — vague
  navigation instructions the customer couldn't follow, a correct diagnosis
  buried under a generic answer repeated verbatim across multiple calls, or
  a right answer to only part of a multi-part question.
- **Not helped / wrong.** Either the connector's data was wrong (matched the
  wrong record, was stale, or reflected a backend bug), or Fin drew an
  incorrect conclusion from correct data — especially watch for
  self-contradictory answers across repeated calls in the same conversation,
  which is a strong signal something is being misread.
  **This verdict requires evidence from outside your own reading of the
  transcript.** Run the checklist in `references/falsification.md`, then name
  your corroborating source. If you have none, return **unverifiable**
  instead — an uncorroborated fault verdict is the commonest way this audit
  produces a finding that collapses on inspection.
- **Unverifiable.** The connector call succeeded, and you still cannot tell
  whether Fin's generic reply reflects empty/unhelpful data or good data it
  ignored. **Before you use this verdict, go and get the payload** — see
  below. It is a real category, but a much smaller one than it first appears,
  and it is the category most often applied by default when the evidence was
  simply never fetched. **Report it as its own category rather than guessing**
  — collapsing it into "not helped" overstates confidence, and collapsing it
  into "helped" understates a real blind spot.

- **Empty — correctly returned nothing.** The payload came back as an empty
  collection because the record genuinely has nothing to return. This is the
  connector *working*, and it deserves its own row rather than being filed as
  a failure to produce data. Distinguishing it from "unverifiable" is the
  single highest-value thing payload access buys you.

## Get the payloads before you read anything

The transcript does not expose what a connector returned. The **execution log
does** — `response_body` on the same `action_execution_results` fetch you
already use for failures, and it covers successful calls, not just failed
ones. See `references/endpoints-and-technique.md`.

Pull bodies for every watch-item execution in your window *before* you read
transcripts or dispatch readers, and carry a per-conversation note of which
calls returned real data and which returned an empty collection. This is not
an optimisation, it is what keeps the audit honest:

- It separates "the connector had nothing to say" from "the connector was
  ignored" — two findings with different owners and opposite fixes, which are
  indistinguishable from a transcript alone.
- It stops the most seductive aggregate error in this whole workflow:
  observing that no reply cited specific data, and concluding the payload
  isn't reaching replies, when most of those calls returned nothing to cite.
  That error looks like a strong systemic finding and survives several
  audits, because every run reproduces it.
- It converts interpretive verdicts into corroborated ones (a response body
  is on the corroboration ladder in `references/falsification.md`).

If your skill's prior runs recorded a standing "we can't see payloads" blind
spot, treat that as a claim to re-test, not a constraint to design around.

## Falsify before you report

Every fault verdict goes through `references/falsification.md` before it
counts: rule out the benign explanation, then name evidence that didn't come
from your own reading. That reference also covers what happens to a verdict
which can't clear the bar — the lead verifies it or it is downgraded, and it
never reaches the report as a fault.

## Reading conversations without blowing your context

Full conversation transcripts are often tens of thousands of tokens once you
include every internal note, tag-assignment event, and workflow marker —
reading more than a handful inline will exhaust your context budget fast.
Once you have more than about three or four conversations to read:

1. Fetch each conversation once and let large results overflow to disk
   (most conversation-fetching tools do this automatically past a size
   threshold, saving to a file and returning a path instead of the content).
2. Fan the reads out to subagents in parallel — one subagent per
   conversation, each told exactly which file to read (in chunked
   offset/limit reads if it's very long), what connector and conversation ID
   it's investigating, and precisely which questions to answer (what was the
   customer asking, did the connector's data get used, what was the
   resolution, quote short passages as evidence). Cap each subagent's report
   to something like 250–350 words so results stay comparable at a glance.
   Name `references/falsification.md` in the dispatch prompt and require each
   reader to run its checklist and state a corroborating source for any fault
   verdict. Readers do not inherit this by implication — a reader who hasn't
   been told to look for the benign explanation reliably won't.
3. Collect the verdicts, then write the aggregate report yourself — don't
   let each subagent's framing stand alone; synthesise across all of them
   for the patterns that only show up in aggregate (e.g. "three separate
   conversations were manually corrected by a human afterwards, and all
   three times the correction contradicted what the connector-informed reply
   said").
   **Resolve every interpretive fault verdict before you aggregate anything**
   — verify it yourself or downgrade it. Aggregation and ranking are where
   an unchecked verdict does its damage, so this cannot wait until after the
   synthesis is written.
4. If a subagent's run fails on a transient error, just relaunch that one —
   don't let one failure block the rest, and don't silently drop it from
   your final count.
   **Verify the address you tell readers to report to.** If reports don't
   arrive, suspect the recipient name before you suspect the readers. Some
   agent-messaging tools accept an unroutable recipient, return success, and
   drop the message — which presents exactly as "the readers finished and
   went idle without reporting," and is easy to misdiagnose as a behavioural
   quirk to be worked around with nudges. Confirm the correct address from
   your harness's own agent listing, and if a whole batch goes silent, test
   one reader against a known-good address before re-prompting all of them.
5. Don't narrate progress in chat as each subagent's result lands ("3 more
   in", "still waiting on 12") — that just turns a long fan-out into a wall
   of low-value status updates. Collect silently in the background and post
   a single message only once the whole batch is done, moving straight into
   the synthesized findings (or the published report). A one-line "starting
   N audits" at kickoff and a one-line "done, report published" at the end
   is enough scaffolding around the silence.

## Same-code retry loop vs. legitimate batch

When one conversation accounts for an outsized share of a connector's calls,
work out why before assuming it's a bug:

- **Legitimate:** the customer supplied multiple distinct identifiers
  (several order numbers, several tasks) in one or a few messages, and
  the call count matches the number of distinct identifiers, or matches new
  follow-up questions arriving over time. This is normal, healthy usage.
- **Worth flagging:** the same identifier is queried repeatedly,
  back-to-back, with no new customer input in between, or connector-start
  and connector-finish events for two *different* named actions appear
  interleaved in a way that suggests a logging or call-pairing artefact
  rather than genuinely repeated calls — either can indicate a bug worth a
  closer look at the underlying automation logic, not the connector's data
  quality.

## Always report with deep links

A percentage or a count is not actionable on its own — always report each
conversation you audited with a direct link back into Intercom
(`https://app.intercom.com/a/inbox/<app_id>/inbox/conversation/<id>` is the
typical shape) alongside its verdict, so whoever reads the report can go
verify or dig deeper themselves without re-running the audit from scratch.
