# Procedure YAML: gotchas and the reasons behind them

Everything here was hit for real while building Procedures with the Intercom CLI. Each one costs a failed upload, a `--verify` mismatch, or a Procedure that saves but doesn't behave. Read this before your first upload. It's quicker than finding them one at a time.

Last verified: 6 Nov 2026, Intercom CLI 0.14.1. The CLI 0.15 notes below were added on 9 Nov 2026, from CLI 0.15.2.

## Before you upload

**Always pass `--workspace <app_id>`.** The CLI has a default workspace. If you're signed in to more than one, the default may not be the one you mean, and "get" or "upload" will quietly act on the wrong workspace. `intercom auth status` and the app ID in your Intercom URLs (`app.intercom.com/a/apps/<app_id>/...`) tell you which is which.

**The first `intercom fin ...` command switches on the Fin SDK for that workspace.** That's usually fine, but it is a change to the workspace. Mention it to the workspace owner the first time.

**No `id` creates a Procedure. An `id` updates that one.** Delete the `id:` line from any template before your first upload. Never copy an `id` from one workspace into another. The server returns the new ID after upload. Use it from then on.

**Upload as `state: draft`, then publish separately.** `intercom fin procedures publish <id>` sets it live; `pause` takes it offline; `versions <id>` shows which version is live. Keeping upload and publish separate means you can preview before customers see it.

**Changing a Procedure that's already live (CLI 0.15 and later): keep `state: live`.** The server saves the upload to the Procedure's draft, warns `live_upload_not_promoted`, and leaves what customers get unchanged until you `publish`. `get` shows `has_unpublished_changes: true` meanwhile, and the editor shows "You are viewing unsaved changes"; **Preview changes** previews the draft. Don't switch `state` to `draft` to make a draft: `publish` and `pause` are just "download, set `state`, upload", so `state` is the on/off switch.

## CLI 0.15.2 quirks

**`--verify` reports every step as changed.** The server now returns each step as an object with an `id` (`- instructions: '...'` plus `id: <uuid>`, and `<end id="..." />`), so a plain-string step never "survives". Compare the content yourself, ignoring the IDs:

```python
import re, yaml
def norm(x):
    if isinstance(x, dict):
        if set(x) - {"id"} == {"instructions"}:
            return norm(x["instructions"])
        return {k: norm(v) for k, v in x.items() if k not in ("id", "version", "has_unpublished_changes")}
    if isinstance(x, list):
        return [norm(i) for i in x]
    if isinstance(x, str):
        return re.sub(r'<end id="[^"]+" />', "<end />", x)
    return x
print(norm(yaml.safe_load(open("p.yaml"))) == norm(yaml.safe_load(open("saved.yaml"))))
```

`saved.yaml` is the output of `intercom fin procedures get <id> --workspace <app_id> saved.yaml`. Your file can keep plain-string steps; the server accepts them.

**`procedures versions` can fail** with "Fin SDK not enabled for this workspace" followed by "Permission denied", in a workspace where `get`, `list` and `upload` work. Use `get` or the editor's version history instead.

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

**The same single-branch rule applies everywhere:** inside a branch (`then:` holding a single `if`) and in a sub-procedure that is only a condition. A sub-procedure like that is a mapping, not a list:

```yaml
'Cancellations: check eligibility':
  condition_type: code
  if: (inputs["temporary"]["Contact reason"] or "") == "Damaged item"
  then: Tell the customer the order can be cancelled. <escalate />
  else:
  - end: section
```

**`condition_type: code` applies to every branch in that step.** You can't mix a code branch and a natural-language branch in one condition. Use two steps.

**Step text takes simple HTML, not markdown.** `<b>`, `<i>`, `<code>`, `<br>` and `<a href="...">` links all survive. Markdown lists don't.

**Code conditions are Python, and attributes can be empty.** An attribute Fin hasn't set yet is `None`, so `inputs["temporary"]["x"].lower()` can crash. Guard it: `(inputs["temporary"]["x"] or "").lower()`, `(inputs["temporary"]["n"] or 0) > 3`.

**Temporary attribute types:** Text is `string`, Number is `integer`, Decimal number is `decimal`, True or false is `boolean`, List is `list` (with `options:`), Date & time is `date`. For dates, say the format you want in the description ("Always store this formatted as YYYY-MM-DD"), because Fin follows it.

**You may see `<number>` in existing trigger examples.** Examples that came from real conversations can have digits redacted to `<number>` (for example "why did payout <number> fail?"). Examples you upload yourself keep their digits. When you copy examples from an existing Procedure, replace `<number>` with a realistic value or remove it.

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
| Conversation attribute | `<write attr="conversation.Name" />` | An existing conversation data attribute |
| Channel | `targeting: channels:` | A channel the workspace actually has set up (for example, `whatsapp` fails if WhatsApp isn't connected) |

These ones only work if the target is **live**: `<switch to="Procedure name" />` (the editor won't offer a draft Procedure) and `<run-workflow to="Workflow name" />` (Handoff to workflow; the editor won't offer a paused workflow).

Because these checks are against the *workspace*, a Procedure copied from one workspace to another often fails on the first upload. Read the error, which names the missing thing, and swap in the target workspace's equivalent.

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
