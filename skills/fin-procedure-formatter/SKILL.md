---
name: fin-procedure-formatter
description: Take messy logic, customer-facing help docs, SOPs, or rough step-by-step instructions and turn them into structured markdown for Intercom Fin Procedures. Use this skill whenever someone wants to format steps for a Fin Procedure, convert help-centre documentation into Procedure logic, draft a sub-procedure, or paste Procedure logic into a project tool. The output is a numbered-list markdown file with nested conditional branches, written as instructions to Fin (not to the customer), following Intercom's documented best practices for Procedures.
author: Conor Pendergrast
---

# Fin Procedure Formatter

Turn raw logic — customer-facing help docs, SOPs, bullet lists, screenshots of internal wikis, or rough notes — into a clean, structured markdown file representing a Fin Procedure (or sub-procedure) that can be pasted directly into a project tool (such as Linear) and then into the Intercom Procedure editor.

The output format closely matches how Intercom's Procedure editor structures Steps and Conditions, so it drops in cleanly.

> **About this skill**
> This is a generic, reusable version of a skill built by Conor Pendergrast for formatting Intercom Fin Procedures. All examples below are fictional and illustrative — replace the placeholder product and platform names with your own.

## When to use this skill

Trigger this skill whenever the user:

- Pastes help-centre documentation, SOPs, or step-by-step instructions and asks for them to be turned into a Fin Procedure or sub-procedure.
- Asks for the steps to be "framed as what I'm going to tell Fin to do".
- Mentions a project tool (e.g. Linear), the Intercom Procedure editor, or pasting procedure logic anywhere.
- Asks for a sub-procedure to be drafted in the same format as a previous one.
- Asks for procedure logic to be cleaned up, restructured, or made consistent.

Do not trigger this skill when:

- The user is asking for advice about Fin Procedure design at a higher level (which procedures to build, how they should fit together, how to score or sequence them) — that's strategy, not formatting.
- The request is to debug or simulate a procedure rather than to format one.
- The request is to optimise a procedure trigger / start list / do-not-start list — use the `intercom-procedure-trigger-optimiser` skill instead.

## Output format

The output is always a markdown file saved to your outputs directory and surfaced to the user. The filename should be descriptive and kebab-case, e.g. `platform-a-sub-procedure.md`, `platform-b-sub-procedure.md`.

### Structure

Every procedure or sub-procedure follows this structure:

1. **H1 header** with a 🪜 emoji prefix, naming the procedure or sub-procedure.
2. **Numbered top-level steps** — each step starts with an imperative-bolded action title followed by the instruction to Fin in plain natural language.
3. **Conditional steps** — written as their own numbered top-level step with the literal word `Conditional:` after the number.
4. **Branches under conditionals** — nested as numbered sub-items, each one written as a customer state ("The customer tells you..."). Branches are mutually exclusive.
5. **Actions within each branch** — nested one level deeper as numbered items.
6. **Else branch** — every Conditional must include an explicit `Else` branch as the last sub-item, even if it just says "Continue to the next step."
7. **End of procedure** — final step is usually a "Does that cover what you need?" check followed by a Conditional with happy / not happy branches.

### Indentation rules

These rules matter because many project tools render nested numbered lists as a/b/c then i/ii/iii automatically, but only if the indentation is correct.

- Top-level steps: no indentation, numbered `1.`, `2.`, `3.`...
- First nested level (branches under a Conditional): 3 spaces of indentation, numbered `1.`, `2.`, `3.`... (rendered as a, b, c).
- Second nested level (actions within a branch): 6 spaces of indentation, numbered `1.`, `2.`, `3.`... (rendered as i, ii, iii).
- Use spaces, not tabs.
- Do not use code blocks, indented code fences, or any formatting that would render as a code block.

### Writing style for instructions to Fin

- Write as instructions to Fin, not as customer-facing prose. "Tell the customer that..." / "Ask the customer..." / "Walk them through..." rather than "You should..." or imperative customer commands.
- Use plain, concrete verbs: ask, check, tell, walk through, confirm, share, end. Avoid abstract verbs like "validate", "ascertain", "perform".
- One coherent unit of work per step. Don't over-fragment.
- No "go back to step 2" or "repeat the verification" — each step should have one clear forward path.
- No "immediately proceed to the next step" filler.
- Reference content via `@Look up content` rather than pasting URLs into Fin's instructions, unless the URL is genuinely deep-linked and stable.
- Reference reusable logic via `Go to Sub-procedure: [Name]`.
- For handoffs, use `@Handoff to the support team` in instructions.
- Branches under a Conditional are written as customer states from Fin's perspective — what the customer told Fin — not abstract booleans.

### What to do with linked help articles

If the source material includes a URL to a help article:

- Replace the URL with `@Look up content for the [topic] article and share it.` as a separate sub-step under the relevant branch.
- Do not paste the URL into the instruction text.
- Exception: if the source material's URL is not retrievable via knowledge sources (e.g. a deep link to a specific external partner's settings page), keep it as plain prose — but flag this in a note at the end.

## Example

Below is a **fictional** example showing how raw source material is transformed into the structured output. The product (`Acme Sync`) and the external platform (`MarketCo`) are invented stand-ins. Substitute your own product and the third-party platforms you integrate with.

### Source material (raw input)

```
Step 4 (MarketCo): Specific steps to troubleshoot pricing issues between Acme Sync and MarketCo

1. Check for other price lists
On MarketCo, pricing is controlled by price lists. Acme Sync only syncs with one price list per item — the Master price list. Other price lists (Derived price lists) take their pricing from the master and always apply a discount.

What you should do:
- Open your MarketCo item's pricing in list-view
- If you have multiple price lists, check their mapping is correct or remove them
- For a derived price list to inherit pricing from the master, it needs a "Linked" badge
- If your derived price list does not have the "Linked" badge, connect it to the master via Settings > Pricing > Price lists > Edit > "Based on an existing price list" > Save > Apply

You can also create multiple master price lists on MarketCo, but Acme Sync will only control one. We do not recommend multiple master price lists.

2. Check discounts
MarketCo promotions: loyalty rates, app-only discounts, and region-based adjustments can reduce the customer-facing price below what Acme Sync sends.

What you should do:
- Log in to MarketCo → Promotions to review active promotions
- Disable any automatic discounts or promotions you did not intend to apply
```

### Output (formatted markdown)

```markdown
# 🪜 Sub-procedure: Platform-Specific Troubleshooting: MarketCo

1. **Check for other price lists on MarketCo.** Tell the customer that on MarketCo, pricing is controlled by price lists, and Acme Sync only syncs with one price list per item — the Master price list. Other price lists (called Derived price lists) take their pricing from the master and always apply a discount. Then ask the customer: "Do you have more than one price list on this MarketCo item?"
2. Conditional:
   1. The customer tells you they have more than one price list on this item
      1. Tell the customer to open their MarketCo item's pricing in list-view and check whether each derived price list has a "Linked" badge next to its name. Explain that the "Linked" badge means the derived price list is correctly taking its pricing from the master price list. If a derived price list doesn't have the "Linked" badge, it needs to be connected to the master, otherwise its pricing will not match what Acme Sync pushes.
      2. Walk them through how to connect a derived price list to the master: log in to MarketCo, go to Settings, select Pricing, open Price lists, click Edit on the derived price list, tick "Based on an existing price list", select the master price list, click Save, then click Apply.
      3. Tell the customer that they can create multiple master price lists on MarketCo, but Acme Sync will only control one of them, and multiple master price lists are not recommended. If they have more than one master price list, suggest they consolidate to a single master or remove the extras.
      4. @Look up content for the article on managing price lists on MarketCo and share it.
   2. The customer tells you they don't know whether they have more than one price list on this item
      1. Walk them through how to check: open the MarketCo item's pricing in list-view and look at how many price lists are shown for the item. Ask them to confirm with you what they find.
   3. Else
      1. Continue to the next step.
3. **Check MarketCo promotions and discounts.** Tell the customer that MarketCo promotions — including loyalty rates, app-only discounts, and region-based adjustments — can reduce the customer-facing price below what Acme Sync sends. This isn't a sync issue between Acme Sync and MarketCo; it's how MarketCo applies its own promotional pricing on top of the price Acme Sync pushes. Then ask the customer to log in to MarketCo, go to Promotions, and review the active promotions on this item.
4. Conditional:
   1. The customer tells you they have promotions or discounts active that they did not intend to apply
      1. Tell the customer to disable any automatic discounts or promotions they did not intend to apply, directly in MarketCo under Promotions.
      2. Remind them that if they still see unexpected pricing after disabling promotions, the difference may be caused by a derived price list rather than a promotion, so it's worth re-checking their price list setup as well.
   2. The customer tells you they don't know whether they have promotions or discounts active
      1. Walk them through how to check: log in to MarketCo, go to Promotions, and review the list of active promotions on this item. Ask them to confirm with you what they find.
   3. Else
      1. Continue to the next step.
5. Ask the customer: "Does that cover what you need? Do you know what the best next step is now?"
6. Conditional:
   1. The customer is happy with the guidance
      1. Thank the customer for their time.
      2. End the procedure.
   2. The customer is not happy with the guidance
      1. Say: "What outstanding questions do you have?"
      2. Use your knowledge sources to address the customer's concerns.
```

## Process

When the user provides source material to format:

1. **Read all the source material first.** Don't start formatting until the whole logical flow is understood. Note any URLs, sub-procedure references, or screenshots that might inform the structure.
2. **Identify the diagnostic checks.** Most of these procedures are sequences of "rule out cause X, then cause Y, then cause Z, then handle the catch-all". Each diagnostic check usually becomes a top-level numbered step followed by a Conditional.
3. **Identify the branches.** Each diagnostic check has at least three customer states: "yes, this is the cause" / "I don't know" / "no". The Else branch handles "no" and continues to the next step.
4. **Convert customer-facing prose into instructions to Fin.** Reframe "you should log in to..." as "Tell the customer to log in to..." or "Walk them through how to log in to...".
5. **Always end with the "Does that cover what you need?" check** as the final step, with happy / not happy branches.
6. **Save the file** to your outputs directory with a descriptive kebab-case filename ending in `-procedure.md` or `-sub-procedure.md`.
7. **Surface the file to the user.**
8. **After delivering the file, briefly note any structural decisions worth flagging** — e.g. branches that were combined, source material that didn't map cleanly, places where a sub-procedure call might be worth extracting. Keep this short.

## Common decisions and how to handle them

**Combining vs splitting diagnostic checks.** If two checks are diagnosed by the same opening question and resolved similarly (e.g. "do you have promotions or rule-sets?"), combine them under one Conditional with separate branches. If they have distinct opening questions, keep them as separate top-level steps.

**Multiple parallel checks within one step.** It's fine to ask the customer two related things in one message ("First, X? And second, Y?") and then branch on each answer. Use this pattern when the checks are quick and related — e.g. checking for "manual changes" and "automatic pricing is enabled" in the same step.

**When source material has a deep procedure within a procedure.** If the source has nested instructions more than two levels deep (e.g. "to do X, first do Y, which requires Z"), flatten this into prose within a single sub-step rather than trying to nest further. Rendering of nested lists breaks down beyond two levels.

**When the source material is incomplete.** If the source doesn't include a fallback for a branch (e.g. "what if the customer says no?"), add an Else branch that continues to the next step. Don't invent new handling that wasn't in the source — flag it at the end as a gap to fill in.

**When source material recommends contacting a third party.** A connected platform's own support team is a valid handoff destination. For your own support team, use `@Handoff to the support team`. For external parties, write it as plain instruction: "Ask the customer to contact the platform's support team directly."
