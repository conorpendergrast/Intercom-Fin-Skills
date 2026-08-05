# HTML report template

A self-contained, single-file HTML report — no build step, no external
requests (the palette and both fonts are system stacks, so nothing needs
fetching). Copy the template below, fill in the placeholders, and either
publish it (if your environment supports publishing HTML pages) or save it
alongside your CSV output and open it in a browser.

## Design intent, briefly

This is scanned, not read top-to-bottom — a dashboard, not an essay. That
shapes every choice below:

- **Priority actions lead.** The reader's first question is "what do I need
  to do", not "what's the full data dump" — so the ranked action list comes
  before the raw connector/watch-item tables, not after.
- **Severity is encoded as colour *and* shape** (a pill plus a left border
  stripe), not colour alone — skimmable at a glance, and still legible if
  someone's colour-blind or the page prints in greyscale.
- **Semantic colour (good/warn/critical) is a separate palette from the
  accent hue.** The accent marks "this is a link/highlight"; the semantic
  colours mark severity. Conflating them (e.g. using red as both "the brand
  colour" and "critical") makes critical findings harder to spot, not
  easier.
- **Verdict pills use their own smaller, muted palette** — they're a dense
  repeated element across many table rows, so they stay quiet rather than
  competing with the severity stripes above them for attention.
- **Both themes are real themes**, not an inverted afterthought — the
  token system below redefines the same custom properties under
  `prefers-color-scheme: dark` and the explicit `data-theme` overrides, so
  whichever theme the reader's system/tool uses, contrast stays legible and
  the accent still reads as chosen rather than default.

Adapt the palette to your own brand if you have one — the point is that it's
a **deliberate choice**, not that these exact hex values are load-bearing.

## The template

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Data Connector Health — {{DATE}}</title>
<style>
  :root {
    --bg: #f4f5f2;
    --surface: #ffffff;
    --surface-alt: #eceee9;
    --ink: #1b2024;
    --ink-muted: #5c636b;
    --ink-faint: #868d94;
    --rule: rgba(20, 24, 28, 0.11);
    --accent: #2e6b72;
    --accent-soft: #e2edee;
    --good: #2f7d51;
    --good-soft: #e5f2e9;
    --warn: #a8631a;
    --warn-soft: #f7ecdd;
    --critical: #b23a30;
    --critical-soft: #f8e6e3;
    --neutral-chip: #5b6472;
    --neutral-chip-soft: #eaecef;
    --shadow: 0 1px 2px rgba(20, 24, 28, 0.04), 0 6px 16px rgba(20, 24, 28, 0.05);
    --font-display: Georgia, "Iowan Old Style", "Palatino Linotype", "URW Palladio L", serif;
    --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    --font-mono: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #10131a; --surface: #171b23; --surface-alt: #1c2129;
      --ink: #e7e9ed; --ink-muted: #a1a8b2; --ink-faint: #767e88;
      --rule: rgba(255, 255, 255, 0.10);
      --accent: #7bc4cc; --accent-soft: #1c2f32;
      --good: #52c98a; --good-soft: #14261d;
      --warn: #e3a34c; --warn-soft: #2a2115;
      --critical: #ff6f63; --critical-soft: #2c1917;
      --neutral-chip: #a7afbc; --neutral-chip-soft: #232833;
      --shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 20px rgba(0,0,0,.35);
    }
  }
  :root[data-theme="dark"] {
    --bg: #10131a; --surface: #171b23; --surface-alt: #1c2129;
    --ink: #e7e9ed; --ink-muted: #a1a8b2; --ink-faint: #767e88;
    --rule: rgba(255, 255, 255, 0.10);
    --accent: #7bc4cc; --accent-soft: #1c2f32;
    --good: #52c98a; --good-soft: #14261d;
    --warn: #e3a34c; --warn-soft: #2a2115;
    --critical: #ff6f63; --critical-soft: #2c1917;
    --neutral-chip: #a7afbc; --neutral-chip-soft: #232833;
    --shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 20px rgba(0,0,0,.35);
  }
  :root[data-theme="light"] {
    --bg: #f4f5f2; --surface: #ffffff; --surface-alt: #eceee9;
    --ink: #1b2024; --ink-muted: #5c636b; --ink-faint: #868d94;
    --rule: rgba(20, 24, 28, 0.11);
    --accent: #2e6b72; --accent-soft: #e2edee;
    --good: #2f7d51; --good-soft: #e5f2e9;
    --warn: #a8631a; --warn-soft: #f7ecdd;
    --critical: #b23a30; --critical-soft: #f8e6e3;
    --neutral-chip: #5b6472; --neutral-chip-soft: #eaecef;
    --shadow: 0 1px 2px rgba(20,24,28,.04), 0 6px 16px rgba(20,24,28,.05);
  }

  * { box-sizing: border-box; }
  html, body { background: var(--bg); color: var(--ink); font-family: var(--font-body); margin: 0; }
  body { font-size: 16px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
  a { color: var(--accent); text-decoration: none; border-bottom: 1px solid transparent; }
  a:hover, a:focus-visible { border-bottom-color: currentColor; }
  a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 2px; }

  .page { max-width: 880px; margin: 0 auto; padding: 48px 24px 96px; display: flex; flex-direction: column; gap: 44px; }

  .masthead { display: flex; flex-direction: column; gap: 14px; padding-bottom: 24px; border-bottom: 1px solid var(--rule); }
  .masthead-top { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .eyebrow { font-family: var(--font-mono); font-size: 12px; letter-spacing: .09em; text-transform: uppercase; color: var(--ink-faint); }
  h1 { font-family: var(--font-display); font-weight: 700; font-size: 34px; line-height: 1.12; margin: 2px 0 0; text-wrap: balance; letter-spacing: -.01em; }
  .masthead-meta { font-family: var(--font-mono); font-size: 13px; color: var(--ink-muted); }
  .stat-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .stat { display: flex; align-items: baseline; gap: 6px; background: var(--surface); border: 1px solid var(--rule); border-radius: 8px; padding: 9px 13px; }
  .stat b { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: 17px; }
  .stat span { font-size: 12.5px; color: var(--ink-muted); }
  .stat.critical b { color: var(--critical); }
  .stat.warn b { color: var(--warn); }

  section { display: flex; flex-direction: column; gap: 16px; }
  .section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  h2 { font-family: var(--font-display); font-size: 21px; font-weight: 700; margin: 0; letter-spacing: -.005em; }
  .section-sub { font-size: 13.5px; color: var(--ink-muted); max-width: 60ch; }

  .actions { display: flex; flex-direction: column; gap: 12px; }
  .action { background: var(--surface); border: 1px solid var(--rule); border-left: 4px solid var(--neutral-chip); border-radius: 9px; padding: 16px 18px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 8px; }
  .action.sev-critical { border-left-color: var(--critical); }
  .action.sev-high { border-left-color: var(--warn); }
  .action.sev-medium { border-left-color: var(--accent); }
  .action.sev-watch { border-left-color: var(--neutral-chip); }
  .action-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .sev-pill { font-family: var(--font-mono); font-size: 10.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; padding: 3px 8px; border-radius: 5px; white-space: nowrap; }
  .sev-critical .sev-pill { background: var(--critical-soft); color: var(--critical); }
  .sev-high .sev-pill { background: var(--warn-soft); color: var(--warn); }
  .sev-medium .sev-pill { background: var(--accent-soft); color: var(--accent); }
  .sev-watch .sev-pill { background: var(--neutral-chip-soft); color: var(--neutral-chip); }
  .action-title { font-weight: 600; font-size: 15.5px; }
  .action-body { font-size: 14.5px; color: var(--ink-muted); max-width: 68ch; }
  .action-body strong { color: var(--ink); font-weight: 600; }
  .action-recommend { font-size: 14px; padding-top: 6px; border-top: 1px dashed var(--rule); margin-top: 2px; }
  .action-recommend b { color: var(--ink); }
  .action-links { display: flex; gap: 8px; flex-wrap: wrap; font-size: 12.5px; }
  .link-chip { font-family: var(--font-mono); background: var(--surface-alt); border: 1px solid var(--rule); border-radius: 6px; padding: 3px 8px; }
  .link-chip:hover { background: var(--accent-soft); border-color: var(--accent); }

  .card { background: var(--surface); border: 1px solid var(--rule); border-radius: 10px; box-shadow: var(--shadow); overflow: hidden; }
  .card-top { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; border-bottom: 1px solid var(--rule); }
  .card-name { font-weight: 600; font-size: 16px; }
  .card-id { font-family: var(--font-mono); color: var(--ink-faint); font-size: 12.5px; }
  .status-pill { font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; }
  .status-pill.critical { background: var(--critical-soft); color: var(--critical); }
  .status-pill.warn { background: var(--warn-soft); color: var(--warn); }
  .status-pill.good { background: var(--good-soft); color: var(--good); }
  .card-body { padding: 16px 20px 20px; display: flex; flex-direction: column; gap: 12px; }
  .card-body p { margin: 0; font-size: 14.5px; color: var(--ink-muted); }
  .metric-strip { display: flex; gap: 20px; flex-wrap: wrap; font-family: var(--font-mono); font-size: 13px; color: var(--ink-muted); }
  .metric-strip b { color: var(--ink); font-variant-numeric: tabular-nums; }

  .table-wrap { overflow-x: auto; border: 1px solid var(--rule); border-radius: 10px; }
  table { border-collapse: collapse; width: 100%; min-width: 640px; background: var(--surface); }
  thead th { text-align: left; font-family: var(--font-mono); font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-faint); font-weight: 600; padding: 10px 14px; background: var(--surface-alt); border-bottom: 1px solid var(--rule); white-space: nowrap; }
  tbody td { padding: 12px 14px; border-bottom: 1px solid var(--rule); font-size: 13.5px; vertical-align: top; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:hover { background: var(--surface-alt); }
  td.calls { font-family: var(--font-mono); font-variant-numeric: tabular-nums; color: var(--ink-muted); white-space: nowrap; }
  td.note { color: var(--ink-muted); max-width: 34ch; }
  .verdict { display: inline-block; font-family: var(--font-mono); font-size: 10.5px; font-weight: 600; letter-spacing: .03em; padding: 3px 8px; border-radius: 5px; white-space: nowrap; }
  .verdict.helped { background: var(--good-soft); color: var(--good); }
  .verdict.mixed { background: var(--warn-soft); color: var(--warn); }
  .verdict.miss { background: var(--critical-soft); color: var(--critical); }
  .verdict.unverified { background: var(--neutral-chip-soft); color: var(--neutral-chip); }

  .callout { background: var(--accent-soft); border: 1px solid var(--rule); border-radius: 10px; padding: 16px 20px; font-size: 14px; color: var(--ink-muted); display: flex; flex-direction: column; gap: 6px; }
  .callout b { color: var(--ink); }

  footer { padding-top: 24px; border-top: 1px solid var(--rule); font-size: 12.5px; color: var(--ink-faint); font-family: var(--font-mono); }

  @media (max-width: 560px) { h1 { font-size: 27px; } .page { padding: 32px 16px 72px; gap: 36px; } }
</style>
</head>
<body>
<div class="page">

  <header class="masthead">
    <div class="masthead-top">
      <div>
        <div class="eyebrow">{{WORKSPACE NAME}} · Fin — Data Connector Health</div>
        <h1>24-hour check, {{DATE}}</h1>
      </div>
      <div class="masthead-meta">{{TOTAL CONNECTORS}} connectors scanned · {{N}} conversations audited</div>
    </div>
    <div class="stat-row">
      <div class="stat critical"><b>{{N}}</b><span>unhealthy connectors</span></div>
      <div class="stat warn"><b>{{N}}</b><span>watch items needing action</span></div>
      <!-- add one .stat per watch item's headline ratio, e.g. <b>4/6</b><span>helped — Connector Name</span> -->
    </div>
  </header>

  <section>
    <div class="section-head">
      <h2>Priority actions</h2>
      <div class="section-sub">Ranked by what needs a decision or a fix first, not by connector name.</div>
    </div>
    <div class="actions">
      <!-- one .action per finding; sev-critical / sev-high / sev-medium / sev-watch -->
      <div class="action sev-critical">
        <div class="action-head">
          <span class="sev-pill">Critical · {{CATEGORY}}</span>
          <span class="action-title">{{One-line summary of the finding}}</span>
        </div>
        <div class="action-body">{{What happened, in plain language. <strong>Bold</strong> the customer/connector names that matter.}}</div>
        <div class="action-recommend"><b>Do:</b> {{The concrete next step — who should do what.}}</div>
        <div class="action-links"><a class="link-chip" href="{{CONVERSATION_URL}}" target="_blank" rel="noopener">conversation {{ID}}</a></div>
      </div>
    </div>
  </section>

  <section>
    <div class="section-head">
      <h2>Connector status</h2>
      <div class="section-sub">Everything not listed here ran healthy.</div>
    </div>
    <div class="card">
      <div class="card-top">
        <div><span class="card-name">{{Connector name}}</span> <span class="card-id">id {{id}}</span></div>
        <span class="status-pill critical">Unhealthy</span>
      </div>
      <div class="card-body">
        <div class="metric-strip"><span><b>{{N}}</b> executions</span><span><b>{{%}}</b> success rate</span><span>failure: <b>{{signature}}</b></span></div>
        <p>{{One or two sentences of context — see references/known-failure-patterns.md for the signature catalogue.}}</p>
      </div>
    </div>
  </section>

  <section>
    <div class="section-head">
      <h2>Watch item — {{Connector name}}</h2>
      <div class="section-sub">id {{id}} · {{N}} executions, {{N}} conversations · {{X}} of {{Y}} clearly helped</div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Customer</th><th>Calls</th><th>Verdict</th><th>Note</th><th>Link</th></tr></thead>
        <tbody>
          <tr>
            <td>{{Customer or short identifier}}</td>
            <td class="calls">{{N}}</td>
            <td><span class="verdict helped">Helped</span></td>
            <td class="note">{{One-line reason for the verdict}}</td>
            <td><a href="{{CONVERSATION_URL}}" target="_blank" rel="noopener">open ↗</a></td>
          </tr>
          <!-- verdict classes: helped / mixed / miss / unverified -->
        </tbody>
      </table>
    </div>
    <!-- include only if "unverified" appears more than once or twice in the table above -->
    <div class="callout">
      <div><b>Why several rows say "unverified"</b></div>
      <div>{{Explain the specific blind spot — usually that the conversation export doesn't expose the connector's actual response payload, only that the call succeeded.}}</div>
    </div>
  </section>

  <footer>{{One line: what this was compiled from, and where the full findings are logged.}}</footer>

</div>
</body>
</html>
```

## Filling it in

Map each section back to the workflow steps in `SKILL.md`:

| Report section | Comes from |
|---|---|
| Stat row in the masthead | Step 1's inventory CSV — total connectors, count degraded/unhealthy |
| Priority actions | The single most important finding from steps 2–4, synthesised — not a raw dump of every failure |
| Connector status cards | Step 2's triage, one card per degraded/unhealthy connector |
| Watch-item tables | Step 3/4's per-conversation audit, one row per conversation, verdict from the taxonomy in `references/conversation-audit-methodology.md` |
| The "unverified" callout | Only needed when the transcript-payload blind spot (see the same reference file) actually shows up in that table |

Keep the priority-actions list short and genuinely ranked — if everything is
"critical," nothing is. A quiet, all-green run still deserves a report; it
just has an empty or near-empty actions section and mostly `good`-status
cards, which is itself useful confirmation, not a reason to skip publishing
one.
