# Previewing a Procedure with Claude in Chrome

`upload --verify` proves Intercom saved what you sent. It doesn't prove Fin *behaves* the way you meant. For that you have to talk to it. The CLI can't do this, so the preview runs in the Intercom web app, driven by **Claude in Chrome** (the browser extension, tools named `mcp__claude-in-chrome__*`) in a Chrome profile that's signed in to the right Intercom workspace.

If Claude in Chrome isn't connected, stop and say so. Don't skip the preview, and don't publish a Procedure nobody has previewed.

## Set up

1. Load the Chrome tools in one go (tabs context, navigate, computer, find, get_page_text), check the open tabs, and work in a **new tab**.
2. Open the Procedure's preview:
   `https://app.intercom.com/a/apps/<app_id>/automation/fin-ai-agent/procedures/<procedure_id>/preview`
3. **Check the tab title names the right workspace** (it reads `<Procedure name> | <Workspace name> | Intercom`). If someone has several Chrome profiles, it's easy to be signed in to the wrong one.
4. The Preview panel is on the right. If it says **"This preview does not use latest changes"**, click **Preview changes**. This works on a **draft that isn't live yet**, which is the point: preview before you publish.
5. Pick **Chat** or **Email** to match the channel you're testing. Use **Testing as** if the Procedure depends on who the customer is (audiences, attributes).

## Run the tests

For each test, type a realistic customer message in **Ask a question...**, press Return, and wait. Fin can take 15–30 seconds, so wait and screenshot again rather than assuming it's stuck.

Test at least:

- **Every branch.** One message per `if`, plus one for the `else`. Write them the way a real customer would, not the way the condition is worded.
- **A near-miss** from your `negative_triggers`. The Procedure should *not* run.
- **A customer who already gave the answer** in their first message. Fin should skip the question it would otherwise ask.
- **The unhappy ending.** Answer "no, that doesn't help" at the final check and confirm Fin hands off.

Use the circular arrow at the top of the panel to start a fresh conversation between tests, so one test doesn't leak into the next.

## Check what actually happened

Click the **eye icon** at the top of the Preview panel. It switches to an event log showing:

- which Procedure ran, and whether it "Successfully finished"
- which guidance Fin followed
- attributes Fin detected or set
- the assignment, when Fin hands off ("As this is just a preview, I can't hand you over" is normal: the hand-off still counts)

This is how you tell "Fin answered well" apart from "Fin answered well *without using the Procedure*". If the log doesn't name your Procedure, the trigger didn't match. Look at `trigger_description` and the examples, not the steps.

## Report back

For each test, record: the message you sent, which Procedure ran (from the log), which branch it took, and pass or fail, with one line on why. If a test fails, fix the YAML, upload again with `--verify`, click **Preview changes**, and re-run that test. Don't edit in the editor and the YAML at the same time.

## Simulations (optional, automated)

The CLI also has `intercom fin simulations` (`generate`, `upload`, `run`, `result`) for repeatable tests. They're a good regression check once a Procedure is stable. They don't replace the hands-on preview for a new Procedure, because you learn the most from reading Fin's actual replies.
