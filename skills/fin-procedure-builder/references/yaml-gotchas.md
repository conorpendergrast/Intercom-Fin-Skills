# Procedure YAML: gotchas and the reasons behind them

Everything here was hit for real while building Procedures with the Intercom CLI. Each one costs a failed upload, a `--verify` mismatch, or a Procedure that saves but doesn't behave. Read this before your first upload. It's quicker than finding them one at a time.

Last verified: 6 Nov 2026, Intercom CLI 0.14.1.

## Before you upload

**Always pass `--workspace <app_id>`.** The CLI has a default workspace. If you're signed in to more than one, the default may not be the one you mean, and "get" or "upload" will quietly act on the wrong workspace. `intercom auth status` and the app ID in your Intercom URLs (`app.intercom.com/a/apps/<app_id>/...`) tell you which is which.

**The first `intercom fin ...` command switches on the Fin SDK for that workspace.** That's usually fine, but it is a change to the workspace. Mention it to the workspace owner the first time.

**No `id` creates a Procedure. An `id` updates that one.** Delete the `id:` line from any template before your first upload. Never copy an `id` from one workspace into another. The server returns the new ID after upload. Use it from then on.

**Upload as `state: draft`, then publish separately.** `intercom fin procedures publish <id>` sets it live; `pause` takes it offline; `versions <id>` shows which version is live. Keeping upload and publish separate means you can preview before customers see it.

## YAML syntax

**Quote any step that contains `: ` (colon then space).** Otherwise YAML reads it as a key and the upload fails with `mapping values are not allowed in this context`. Wrap the whole step in single quotes and double any apostrophe inside it: `'Ask: "What''s your order number?"'`. Content titles with colons in them are the usual culprit.

**Don't put markdown lists inside a step.** Nested numbered or bulleted lists in a step's text get flattened into one paragraph. Use `decide` / `if` / `then` / `else` for structure, and a YAML list under `then:` for several actions in a branch.

**A condition with one `if` is saved as a bare `if/then/else`.** If you write a `decide:` list with a single `if`, Intercom stores it as:

```yaml
- if: the customer is happy
  then:
  - Thank the customer.
  - <end />
  else: Tell the customer a teammate will help. <escalate />
```

Write it that way to begin with, or `upload --verify` reports a mismatch on `decide`.

**`condition_type: code` applies to every branch in that step.** You can't mix a code branch and a natural-language branch in one condition. Use two steps.

**Long lines get re-wrapped by the server.** That's cosmetic. `--verify` compares content, not layout.

## References that must match something real

The server checks these at upload, and rejects the whole Procedure if one is missing:

| Reference | Syntax | Must match |
|---|---|---|
| Help Center article | `<content_lookup attr="article.Exact title" />` | An article title, exactly |
| Synced webpage / external content | `<content_lookup attr="external_content.Exact title" />` | The source's title, exactly |
| Data connector | `<use action="Connector name" />` | The connector's name, exactly |
| Code block | `<execute_code_block name="Block name" />` | A key under `code_blocks:` |
| Sub-procedure | `run: Name` | A key under `procedure:` |
| Temporary attribute | `temporary.Name` | A key under `temporary_attributes:` |

These ones only work if the target is **live**: `<switch to="Procedure name" />` (the editor won't offer a draft Procedure) and Handoff to workflow (the editor won't offer a paused workflow).

## Blocks with extra rules

- **Loop in teammate / agent (`human_in_the_loop`)** must collect at least one attribute (`attributes_to_collect`), or it won't save.
- **Wait for webhook** shows a warning in the editor until a data connector sends its callback URL. It still saves. Its settings live under `inline_tool_definitions`, keyed by the `id` in the step.
- **End** is `<end />` in `main`. Inside a sub-procedure there's also `end: section`, which returns to the step that ran the sub-procedure instead of ending everything.
- **A trigger description or an event trigger is required.** With neither, the editor refuses to save ("Please add a description or configure an event").

## Reading data

- In text: `<read attr="user.first_name" type="attribute" />` for person/company/conversation attributes, `<read attr="temporary.Name" type="attribute" />` for temporary ones, and `<read attr="Connector name > path > field" type="data_connector_output" />` for a connector's response.
- In a code condition: `inputs["user"]["email"]`, `inputs["temporary"]["Name"]`, `inputs["data_connector"]["Connector name"]["field"]`.
- Every data connector call also exposes `status_code` and `error`. Check `status_code` straight after the call (see the data connector template).

## Read the upload response

`upload` returns JSON with a `warnings` list. These come from Intercom's own Procedure linter, and each includes a `convention` explaining the rule. The one you'll see most: `unnecessary_temp_attrs`. A temporary attribute is only worth it when a code condition routes on a fixed set of options, or when a value has to go into a `<note>`. Fin can refer to anything else the customer said without storing it first.

## The editor and the YAML don't always agree on display

- "Train Fin on examples (0)" can show zero after a CLI upload even when `positive_triggers` saved. `procedures get` is the source of truth.
- The editor may keep an unsaved local draft. If you upload while the editor is open with unsaved changes, reload it before touching it, or a click on "Save" can overwrite your upload.

## Things that run before your Procedure

Escalation rules on Fin attributes and topics fire before Procedures. If a rule hands off a topic, a Procedure for that topic never runs. Check your escalation rules when a Procedure that previews fine never fires on real conversations.
