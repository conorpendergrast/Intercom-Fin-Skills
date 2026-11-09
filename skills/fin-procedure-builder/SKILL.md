---
name: fin-procedure-builder
description: Create or update an Intercom Fin Procedure as YAML and push it to a workspace with the Intercom CLI (`intercom fin procedures upload`), then preview it with Claude in Chrome before it goes live. Use this skill whenever someone wants to build, upload, create, push, publish, or edit a Fin Procedure through the CLI or as YAML, turn a drafted Procedure (for example the markdown from fin-procedure-formatter) into a real Procedure in Intercom, or asks "what does the Procedure YAML look like?". Also use it when an upload fails, `--verify` reports a mismatch, or a Procedure saves but doesn't behave as expected. It ships annotated YAML templates, so nobody has to reverse-engineer the format from an existing Procedure.
author: Conor Pendergrast
---

# Fin Procedure Builder

Get a Fin Procedure from "here's the logic" to "it's in Intercom, it previews correctly, and it's ready to go live", using the Intercom CLI and a YAML file.

The hard part isn't the CLI. It's the YAML. The format isn't documented anywhere obvious, and you can't learn it from your own workspace if you've never built a Procedure there. This skill ships three templates so you start from a known-good file every time:

| Template | Use it for |
|---|---|
| `references/template-all-features.yaml` | **Reference only.** Every block the editor can produce, with comments. Look things up here. |
| `references/template-with-data-connector.yaml` | **Start here** when Fin looks something up: call one data connector, check it worked, answer from the result. |
| `references/template-no-data-connector.yaml` | **Start here** when Fin can't look anything up: triage, answer the simple case from your help content, hand off the rest. |

The two starting templates are opinionated. Their header comments explain each opinion, so you can disagree on purpose rather than by accident.

> **About this skill**
> Built by Conor Pendergrast. All examples are fictional. Replace the placeholder product, connector and article names with your own.

## Step 0: Get the latest version first

Intercom adds Procedure features regularly, and the templates in this skill get updated to match. **Before writing any YAML, make sure you're using the latest templates and the latest CLI.** An old template can teach you an old format.

1. **Update the skill's references.**
   - If this skill lives inside a git clone of `conorpendergrast/Intercom-Fin-Skills`, run `git pull` in that clone.
   - If it doesn't (most installs are copies, not clones), fetch the current files from GitHub into a scratch folder and use those instead of the local copies:
     ```
     https://raw.githubusercontent.com/conorpendergrast/Intercom-Fin-Skills/main/skills/fin-procedure-builder/SKILL.md
     https://raw.githubusercontent.com/conorpendergrast/Intercom-Fin-Skills/main/skills/fin-procedure-builder/references/template-all-features.yaml
     https://raw.githubusercontent.com/conorpendergrast/Intercom-Fin-Skills/main/skills/fin-procedure-builder/references/template-with-data-connector.yaml
     https://raw.githubusercontent.com/conorpendergrast/Intercom-Fin-Skills/main/skills/fin-procedure-builder/references/template-no-data-connector.yaml
     https://raw.githubusercontent.com/conorpendergrast/Intercom-Fin-Skills/main/skills/fin-procedure-builder/references/yaml-gotchas.md
     https://raw.githubusercontent.com/conorpendergrast/Intercom-Fin-Skills/main/skills/fin-procedure-builder/references/preview-with-claude-in-chrome.md
     ```
   - If the fetched `SKILL.md` differs from this one, follow the fetched one.
   - If you can't reach GitHub, say so and carry on with the local copies, noting their "Last verified" date.
2. **Update the CLI.** Install or update with `npm install -g @intercom/cli`, then check `intercom --version`. Each template's header says which CLI version it was verified against. If yours is newer and something doesn't match, trust what the server returns (see Step 4) and flag the difference.

## Step 1: Check the setup

- **Signed in:** `intercom auth status`. If not, the user runs `intercom auth login` themselves.
- **The right workspace:** get the workspace's app ID (it's in every Intercom URL: `app.intercom.com/a/apps/<app_id>/...`) and pass `--workspace <app_id>` on **every** command. The CLI's default workspace may be a different one.
- **First `intercom fin` command:** it switches on the Fin SDK for that workspace. Tell the user before you run it the first time.
- **Claude in Chrome connected**, in a Chrome profile signed in to the same workspace. You need it for Step 5.
- **Everything the Procedure will reference exists:** articles (exact titles), data connectors (exact names), any Procedure you'll `switch` to (must be live). The upload is rejected if a reference is missing.

## Step 2: Pick a template and write the YAML

1. Open `references/yaml-gotchas.md` and skim it. It's short, and it covers every failed upload we've hit.
2. Copy the starting template that fits. Delete its `id:` line (that's how you create a new Procedure), and delete its comments.
3. Write the steps. Look up any block you need in `template-all-features.yaml` and copy its syntax exactly.
4. If you're starting from the markdown that `fin-procedure-formatter` produces, map it like this:

| Formatter markdown | Procedure YAML |
|---|---|
| A numbered step | A string in the `main:` list |
| `Conditional:` with numbered branches | `- decide:` with one `- if: ... then: ...` per branch |
| The `Else` branch | `else:` |
| A Conditional with only one branch plus Else | A bare `- if: ... then: ... else: ...` (no `decide`) |
| Several actions in a branch | A YAML list under `then:` |
| `@Handoff to the support team` | `<escalate />` |
| `@Look up content for the X article` | `<content_lookup attr="article.Exact title" />` |
| `Go to Sub-procedure: Name` | `run: Name`, with `Name:` as its own key under `procedure:` |
| "End the procedure" | `<end />` |

5. Check the YAML parses before uploading (for example `python3 -c "import yaml; yaml.safe_load(open('p.yaml'))"`). It's quicker than a failed upload.

## Step 3: Upload as a draft

```
intercom fin procedures upload p.yaml --workspace <app_id> --verify --note "what changed"
```

- **A new Procedure:** keep `state: draft` in the file. Uploading doesn't make anything live.
- **A Procedure that's already live:** leave `state: live` in the file, exactly as `get` returned it. Since CLI 0.15, the server saves your upload to the Procedure's *draft* and leaves the live version alone. The response carries the warning `live_upload_not_promoted` ("Saved to the procedure's draft; the live version was not changed"), and `get` then shows `has_unpublished_changes: true`. Customers keep the old version until you publish (Step 6). Don't change `state` to `draft` to get a draft: `publish` and `pause` work by setting `state` and uploading, so `state` is the switch, not a label.
- `--verify` fails if anything you sent didn't come back the same. The usual causes, and fixes, are in `yaml-gotchas.md`. **On CLI 0.15.2 it also flags every step as a mismatch**, because the server now returns each step with an `id`. Check by hand instead (see `yaml-gotchas.md`).
- `--note` labels this save in the version history.
- The response includes the Procedure's ID. Put it into your file as `id:` so the next upload updates instead of creating a duplicate.

## Step 4: Read what the server said

- **Warnings:** the JSON response has a `warnings` list from Intercom's own linter, each with a `convention` explaining it. Act on them or tell the user why not.
- **What was saved:** `intercom fin procedures get <id> --workspace <app_id>`. If it differs from your file in a way `--verify` didn't flag, the saved version shows the format Intercom expects. Copy it.

## Step 5: Preview with Claude in Chrome

Follow `references/preview-with-claude-in-chrome.md`. In short: open the Procedure's preview page, click **Preview changes**, send realistic customer messages for every branch plus a near-miss, and use the event log (the eye icon) to confirm *your* Procedure ran and which branch it took.

Report each test as message → Procedure that ran → branch → pass/fail. If something fails, fix the YAML and go back to Step 3.

## Step 6: Publish only when the user says so

Publishing changes what real customers get, so **ask before you publish**, every time, even if the user approved a previous publish.

```
intercom fin procedures publish <id> --workspace <app_id> --note "why"
intercom fin procedures versions <id> --workspace <app_id>   # confirm which version is live
```

`publish` makes the draft live. `intercom fin procedures pause <id>` takes it offline again.

Before you publish over a live Procedure, save what's live now (`intercom fin procedures get <id> --workspace <app_id> > before.yaml`), so rolling back is one upload and one publish.

On CLI 0.15.2, `versions` can fail with "Fin SDK not enabled" in a workspace where `get` and `list` work. If it does, check the result with `get` (`state: live`, no `has_unpublished_changes`) or the editor's version history.

## Keeping the templates current (for maintainers)

The all-features template comes from a real Procedure built by hand in the editor, not from guesswork. To refresh it when Intercom ships something new:

1. In a sandbox workspace, open the reference Procedure in the editor and add the new feature by hand (type `@` in a step to see every tool).
2. `intercom fin procedures get <id> --workspace <app_id>` and diff against `template-all-features.yaml`.
3. Add the new block with an `Editor:` / `Note:` comment, swap every real name for a fictional one, and bump the "Last verified" date and CLI version.
4. Check it round-trips: map the fictional names back to real ones in the sandbox and run `upload --verify`.
5. Open a pull request. Don't push to `main`.

Known gaps right now: the Website element click and API Call event triggers.

If you can't build a feature in a sandbox (Handoff to workflow, for example, needs a live workflow), reading a production Procedure that already uses it is fine: `procedures get` is read-only. Copy only the syntax, never the client's wording or names, and mark the block "From a production Procedure" in the template.
