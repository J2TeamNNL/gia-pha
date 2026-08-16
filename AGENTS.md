# AGENTS.md

Instructions for AI coding agents working in this repository.

The full guidance lives in [`CLAUDE.md`](CLAUDE.md) and applies to every agent regardless of
runtime. This file exists so agents that look for `AGENTS.md` by convention find it.

## Start here

1. [`.docs/README.md`](.docs/README.md) — entrypoint and source-of-truth map
2. [`.docs/v0.2/README.md`](.docs/v0.2/README.md) — current version index
3. [`CLAUDE.md`](CLAUDE.md) — commands, architecture, conventions, and known traps
4. [`.agents/rules/rule.md`](.agents/rules/rule.md) — knowledge and tracking rule

## Non-negotiable

- Read the current version directory before changing anything.
- Never describe TARGET or FUTURE behavior as CURRENT implementation.
- Never edit a frozen version directory such as `.docs/v0.1/`.
- Finish a task by updating `.docs/v0.2/tasks.md` and appending a `changelog.md` entry with
  What, Why, Impact, and References.
- Do not delete historical decisions. Supersede them and link the replacement.
