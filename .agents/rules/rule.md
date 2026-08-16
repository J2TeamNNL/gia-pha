---
trigger: model_decision
---

# Project Knowledge and Tracking Rule

**Crucial Instruction for all AI Agents:**

You MUST use `/.docs/README.md` as the entrypoint and source-of-truth map.

## Goals:

1. **Context Awareness:** Ensure you always know what has been done, what is currently in progress, and what will be done next.
2. **History Preservation:** Keep a detailed, running history of changes, decisions, and progress.
3. **AI Handoff:** Make the project state easily understandable for future AI agents or context window resets.

## Layout:

Documentation is versioned as complete snapshots under `.docs/vN.N/`, each holding the same
seven numbered files. The highest version is current; lower versions are frozen history and
are never edited. `.docs/reference/` holds background material that informs those documents
without governing them.

## Workflow:

- **At the start of a session:** Read `.docs/README.md`, then `01-overview.md` and the ADRs in `02-decisions.md` relevant to the requested work, from the current version directory.
- **During the task:** Update the backlog table in `01-overview.md` to reflect in-progress items.
- **When finishing a task or session:**
  - Append completed items and discoveries to the relevant files in the current version.
  - Update `07-changelog.md` with What, Why, Impact, and References.
  - Ensure `01-overview.md` still accurately reflects the project state.
  - Never describe TARGET or FUTURE behavior as CURRENT implementation.
  - Never edit a frozen version directory.
