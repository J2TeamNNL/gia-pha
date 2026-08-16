# AI Knowledge Base

Entrypoint for every AI session and maintainer working on this repository.

## Layout

Documentation is versioned as complete snapshots. Each `vN.N/` directory holds the same
eight files and describes the whole project at that point, so one directory is enough to
understand the state — no reading backwards through earlier versions.

```
.docs/
  v0.1/        frozen 2026-07-12
  v0.2/        current
  reference/   background material, not doctrine
```

## Current version

**v0.2** is the source of truth. Start at `v0.2/README.md`.

| File | Contents |
|---|---|
| `README.md` | Index and what changed from the previous version |
| `brief.md` | Product intent, audience, boundaries, confirmed roadmap |
| `plan.md` | Delivery phases |
| `context.md` | Architecture, domain model, format contracts, xưng hô specification |
| `decisions.md` | Accepted decisions with rationale |
| `tasks.md` | Executable backlog with acceptance criteria |
| `flow.md` | UX and data flows with diagrams |
| `changelog.md` | History with reasons |

## Reference

`reference/` holds material that informs the versioned documents without governing them:
three competitor analyses, the legacy prototype review, a VPS audit, and dated scouting
reports under `reference/reports/`.

Reports describe the repository at a moment in time. Where a report and a versioned
document disagree, the versioned document wins.

## Documentation rules

- Distinguish `CURRENT`, `TARGET`, and `FUTURE`; never describe planned work as implemented.
- Add a decision record when a durable technical or product decision changes; supersede and
  link the old one rather than deleting it.
- Every completed task updates `tasks.md` and appends a `changelog.md` entry containing
  What, Why, Impact, and References.
- `flow.md` carries at least one Mermaid diagram wherever architecture, data flow, or UI
  flow is relevant.
- Product prose may be Vietnamese; API names, schemas, and code identifiers remain English.
- Preserve Vietnamese diacritics in user-facing content.

## Versioning

Cut a new `vN.N/` by copying the current version wholesale and editing it. Mark the previous
version frozen in its header comment and leave it untouched from then on — a frozen snapshot
is history and is never corrected in place.
