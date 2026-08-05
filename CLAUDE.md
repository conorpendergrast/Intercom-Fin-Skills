# CLAUDE.md — guide for AI assistants working in this repo

## What this repo is

A public collection of reusable **Claude Agent Skills** for working with **Intercom Fin**
(Intercom's AI support agent) and its surrounding Help Center content. Maintained by Conor
Pendergrast (CustomerSuccess.cx). MIT licensed.

It is **not** an application — there's no build, no test suite, no tech stack to choose. Each
skill is a folder of Markdown (plus the occasional helper script) that Claude Code or Claude
Cowork loads on demand. If you catch yourself reaching for `package.json`, a linter, or a CI
pipeline, stop: none of that belongs here.

## The skills

Each lives in `skills/<name>/`:

- **`fin-procedure-advisor`** — decides which Fin Procedures to build and in what order (Filter → Score → Sequence).
- **`fin-procedure-formatter`** — turns rough notes/SOPs into clean, paste-ready Fin Procedure markdown.
- **`intercom-procedure-trigger-optimiser`** — sharpens a Procedure's description and start / do-not-start lists to cut misfires.
- **`intercom-bulk-article-updates`** — safely reads, edits, and bulk-updates Help Center article bodies without corrupting them or losing progress.
- **`intercom-data-connector-health-check`** — audits data connector health metrics AND whether connectors actually help customers (not just HTTP success), via UI-only endpoints and conversation-level auditing.

The `README.md` documents each for end users; keep it in sync when you add or rename a skill.

## Anatomy of a skill

```
skills/<name>/
├── SKILL.md          # required: YAML frontmatter + instructions
├── references/       # optional: deeper docs, loaded only when needed
└── scripts/          # optional: helper scripts the skill runs
```

- **Frontmatter** needs `name` and `description`. The **description is the whole triggering
  mechanism** — Claude reads it to decide whether to use the skill, so write it to say both
  *what the skill does* and *when to reach for it*, including the phrases a user would actually
  type. Be a little pushy: skills tend to under-trigger.
- **Keep `SKILL.md` focused** (aim under ~500 lines). Push long detail into `references/` and
  point to it, so it only loads when relevant. This "progressive disclosure" keeps the skill
  cheap to have available.

## Conventions

- **Names** are kebab-case and descriptive (`intercom-bulk-article-updates`).
- **British English**, friendly and plain — explain the *why*, avoid jargon and heavy-handed
  `MUST`/`NEVER` where a reason would do.
- **All examples are fictional and illustrative.** Never include a real customer's name,
  workspace ID, article ID, internal URL, or any confidential detail — this repo is public.
  Use placeholder product and platform names (the README says as much).
- **Match the house style** of the existing skills when adding a new one.

## Adding or changing a skill

1. Create/edit `skills/<name>/SKILL.md` (plus `references/` and `scripts/` as needed).
2. Add or update its entry in `README.md`'s **Available Skills** section, matching the existing
   format.
3. Sanity-check any scripts actually run, and re-read the `description` — would it trigger on a
   realistic request without firing on unrelated ones?

## Git workflow

- Work on a branch named `claude/<short-description>`. **Never push to `main` without explicit
  permission** — open a pull request and let Conor merge.
- Commit messages: imperative mood, a concise summary line, a short body explaining the *why*.
- **Never commit secrets** (`.env`, tokens, credentials). Never force-push without permission.

## Useful links

- [Extend Claude with skills](https://code.claude.com/docs/en/skills) — Claude Code skills docs
- [Use skills in Claude](https://support.claude.com/en/articles/12512180-use-skills-in-claude) — Cowork/claude.ai
- [Intercom Developer Docs](https://developers.intercom.com/) · [CustomerSuccess.cx](https://customersuccess.cx)
