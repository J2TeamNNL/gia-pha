---
trigger: model_decision
---

# Project Management & Tracking Rule

**Crucial Instruction for all AI Agents:**

You MUST ALWAYS read and append updates to the tracking files located in the `/.plan/` directory.
These files include:

- `/.plan/plan.md`
- `/.plan/flow.md`
- `/.plan/task.md`
- `/.plan/overview.md`
- `/.plan/changelog.md`

## Goals:

1. **Context Awareness:** Ensure you always know what has been done, what is currently in progress, and what will be done next.
2. **History Preservation:** Keep a detailed, running history of changes, decisions, and progress.
3. **AI Handoff:** Make the project state easily understandable for future AI agents or context window resets.

## Workflow:

- **At the start of a session:** Read `overview.md`, `plan.md`, `task.md`, and `flow.md` to understand current context and pending tasks.
- **During the task:** Update `task.md` to reflect in-progress items.
- **When finishing a task or session:**
  - Append completed items and new discoveries to the relevant files.
  - Update `changelog.md` with a summary of what was accomplished.
  - Ensure the high-level `overview.md` and `plan.md` still accurately reflect the project state.
