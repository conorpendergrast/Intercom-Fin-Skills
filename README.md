# Intercom-Fin-Skills

This is a public repository of reusable Claude Code skills for Intercom Fin, created and maintained by Conor Pendergrast of CustomerSuccess.cx.

## Overview

This repository hosts skills designed to help B2B SaaS support teams make better decisions about Intercom Fin automation. Each skill provides expert guidance and structured frameworks for implementing Fin capabilities.

## Available Skills

### 🎯 Fin Procedure Advisor

**Directory:** `skills/fin-procedure-advisor/`

An interactive decision framework that helps B2B SaaS support leaders choose which Fin Procedures to build and in what order.

**Use this skill when:**

- Deciding which Fin Procedures to build first
- Prioritising your Fin automation strategy
- Evaluating whether a process is a good Procedure candidate
- Choosing between different automation approaches

**What it does:** The skill walks you through a structured **Filter → Score → Sequence** process:

- **Filter:** Determines whether something should be a Procedure or belongs elsewhere (Knowledge Hub, Guidance, Data Connector)
- **Score:** Evaluates candidates across five dimensions (Customer Impact, Process Clarity, Technical Readiness, Complexity Ceiling, Human Handoff Design)
- **Sequence:** Recommends a build order starting with confidence builders

### 🪜 Fin Procedure Formatter

**Directory:** `skills/fin-procedure-formatter/`

Turns messy logic — help docs, SOPs, bullet lists, or rough notes — into clean, structured markdown for an Intercom Fin Procedure, written as instructions to Fin and ready to paste into your project tool and the Procedure editor.

**Use this skill when:**

- Drafting a new Procedure or sub-procedure from existing documentation
- Converting customer-facing help articles into Procedure logic
- Cleaning up or standardising the format of an existing Procedure
- Preparing Procedure steps to paste into Intercom

**What it does:** It reframes customer-facing prose as instructions to Fin, structures the logic into numbered steps with nested conditional branches and explicit `Else` paths, applies consistent indentation, and closes every Procedure with a "Does that cover what you need?" check — all following Intercom's documented best practices.

### 🔍 Intercom Procedure Trigger Optimiser

**Directory:** `skills/intercom-procedure-trigger-optimiser/`

Audits and improves a Procedure's **description**, **start list**, and **do-not-start list** to reduce false positives and sharpen when Fin fires.

**Use this skill when:**

- Fin keeps triggering the wrong Procedure on the wrong messages
- You want to tighten a Procedure's start or do-not-start list
- A Procedure is misfiring and you want to diagnose why
- You'd like a fresh pair of eyes auditing a Procedure's trigger accuracy

**What it does:** It analyses your false positives (and optional false negatives), pinpoints overlapping intent boundaries, and proposes a revised description plus copy-pastable start and do-not-start lists (capped at 30 entries each), with the reasoning kept separate so the lists drop straight into Intercom.

## How to Use These Skills

1. Copy the skill file (`SKILL.md`) from the relevant skill directory
2. Add it to your Claude Code configuration in your project
3. Use the skill by referencing its name in your workflow

For more information about using Claude Code skills, see the [Claude Code documentation](https://claude.ai/docs).

## About

This is a public repo for Intercom Fin Skills, created and maintained by Conor Pendergrast of CustomerSuccess.cx. All examples in these skills are fictional and illustrative — replace the placeholder product and platform names with your own.

## License

Released under the [MIT License](LICENSE).
