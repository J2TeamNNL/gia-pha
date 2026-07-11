---
trigger: model_decision
---

# Project Knowledge and Tracking Rule

**Crucial Instruction for all AI Agents:**

You MUST use `/.plan/README.md` as the entrypoint and source-of-truth map.

## Goals:

1. **Context Awareness:** Ensure you always know what has been done, what is currently in progress, and what will be done next.
2. **History Preservation:** Keep a detailed, running history of changes, decisions, and progress.
3. **AI Handoff:** Make the project state easily understandable for future AI agents or context window resets.

## Workflow:

- **At the start of a session:** Read `.plan/README.md`, `overview.md`, `task.md`, and all ADRs relevant to the requested work.
- **During the task:** Update `task.md` to reflect in-progress items.
- **When finishing a task or session:**
  - Append completed items and discoveries to the relevant files.
  - Update `changelog.md` with What, Why, Impact, and References.
  - Ensure the high-level `overview.md` and `plan.md` still accurately reflect the project state.
  - Never describe TARGET or FUTURE behavior as CURRENT implementation.
