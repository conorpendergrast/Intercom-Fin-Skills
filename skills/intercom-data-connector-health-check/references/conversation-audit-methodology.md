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
many times in a row — a host pasting a batch of ten reservation codes at
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
- **Unverifiable.** The connector call succeeded, but the transcript export
  doesn't expose the actual response payload — many conversation-export
  formats only log a bare `{"action": {"name": ..., "result": "success"}}"`
  marker for tool calls, not the body. If Fin's very next reply is generic
  and never cites anything specific, you cannot tell from the transcript
  alone whether that's because the data was empty/unhelpful or because Fin
  simply didn't use good data. **Report this as its own category rather than
  guessing** — collapsing it into "not helped" overstates confidence, and
  collapsing it into "helped" understates a real blind spot. If this
  category dominates your results for a connector, say so explicitly and
  recommend checking the connector's raw response via its actual backend
  logs, not just Intercom's export.

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
3. Collect the verdicts, then write the aggregate report yourself — don't
   let each subagent's framing stand alone; synthesise across all of them
   for the patterns that only show up in aggregate (e.g. "three separate
   conversations were manually corrected by a human afterwards, and all
   three times the correction contradicted what the connector-informed reply
   said").
4. If a subagent's run fails on a transient error, just relaunch that one —
   don't let one failure block the rest, and don't silently drop it from
   your final count.

## Same-code retry loop vs. legitimate batch

When one conversation accounts for an outsized share of a connector's calls,
work out why before assuming it's a bug:

- **Legitimate:** the customer supplied multiple distinct identifiers
  (several reservation codes, several tasks) in one or a few messages, and
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
