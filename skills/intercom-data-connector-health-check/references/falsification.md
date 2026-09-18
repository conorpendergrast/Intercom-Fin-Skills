# Falsifying a finding before you report it

An audit that goes looking for anomalies will find them. A failure inside a
response body, a reply that reads badly, a connector firing somewhere it
seems not to belong — each of these *looks* like a finding, and none of them
is one until the ordinary explanation has been ruled out.

Two properties make this worth a dedicated step rather than a footnote:

- **The mistakes are unidirectional.** They all run toward finding fault, so
  they don't cancel out in aggregate — they compound into whatever ranking
  the report ends up publishing.
- **The mistakes are silent.** A wrongly-generous "helped" verdict
  embarrasses nobody. A wrongly-harsh one gets published as a recommendation
  somebody may act on, and the person best placed to catch it is the person
  who already trusts your report.

So before any fault verdict — the taxonomy's "not helped / wrong" bucket —
run the checklist, then name your evidence.

## The benign-explanation checklist

**1. Was the input valid?** Did the customer supply an identifier that was
malformed, mistyped, or incomplete *at that point in the thread*? People
routinely paste a record ID with a missing prefix, a transposed character, or
the wrong reference entirely, then correct it a few messages later. A "not
found" response — or a failure envelope inside the body — against a bad
identifier is the connector working correctly. Read the thread for what was
actually supplied and when, not just for what the automation said about it.

**2. Did it self-correct later?** Judge the thread's outcome, not its worst
individual message. An automation that gets something wrong, gets corrected,
and then gets it right has not failed the customer. Quoting only the first
half of that exchange produces a damning excerpt and a false verdict.

**3. Is the negative the right answer?** Empty and not-found results are
sometimes the diagnosis rather than a failure. An empty log can mean "this
operation was never attempted," which may be exactly what the customer needed
to know. Work out what a correct negative would look like here, and check
whether that's what you're holding.

**4. Is this by design?** Some connectors fire speculatively by design — a
best-effort repair, a pre-fetch, a cache warm — so firing on a question they
cannot answer is intended behaviour, not a targeting bug. The state file's
expected-behaviour registry is where this is recorded. Consult it before
calling any firing pattern anomalous, and add to it whenever you dismiss a
finding on these grounds.

**5. Whose fault is it?** Separate "the automation worded something badly"
from "the connector returned wrong data." They have different owners and
different fixes, and a connector-health report that conflates them sends
people to the wrong team.

## The corroboration ladder

Once the checklist is clear, a fault verdict still needs evidence that didn't
come from you. A verdict is **corroborated** if at least one of these holds:

- an internal engineering or investigation note contradicting the automation
- an existing bug ticket already filed for the same behaviour
- a human agent's later reply diagnosing it differently
- the customer explicitly refuting it in-thread
- the connector's actual response body, visible in the execution logs

Otherwise it is **interpretive**: it rests on how you read the automation's
wording, and nothing else. Interpretive is not a synonym for wrong; it means
unconfirmed, and the two tiers collapse under inspection at very different
rates.

## What to do with an interpretive verdict

**A fault verdict requires corroboration.** An interpretive one has exactly
two fates:

1. **The lead verifies it directly** — reads the raw transcript, works out
   whether a benign explanation holds, and either promotes it to corroborated
   (citing what they found) or drops it.
2. **It is downgraded to unverifiable** and counted in the blind-spot total.

It is never published as a fault on interpretive evidence alone, and it never
drives a priority action. Downgrading is the correct default when
verification budget runs out: under-claiming is recoverable, while a
published finding that collapses under inspection costs more than the finding
was ever worth.

Resolve every interpretive verdict **before** aggregating. Ranking is where an
unchecked verdict does its damage, so the resolution has to happen upstream of
it.
