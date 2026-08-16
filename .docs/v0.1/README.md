<!-- snapshot: v0.1 | frozen: 2026-07-12 | superseded by v0.2 -->

# Gia Phả — v0.1

Frozen snapshot of the project as documented on 2026-07-12, immediately after `UI-002`
landed. **Superseded by `v0.2`.** Read this only for history; it is never edited.

## Contents

| File | Contents |
|---|---|
| `brief.md` | Product intent, audience, MVP boundary, confirmed post-MVP roadmap |
| `plan.md` | Delivery phases 0–4 |
| `context.md` | Target architecture, domain model, JSON/GEDCOM contracts |
| `decisions.md` | ADR-001 … ADR-010 |
| `tasks.md` | Executable backlog with acceptance criteria |
| `flow.md` | UX workflows, data flows, tree lifecycle diagram |
| `changelog.md` | History through 2026-07-12 |

## State at this snapshot

Delivered: quality baseline, SQLite WASM/OPFS runtime, multi-tree catalog, domain schema
and migrations, genealogy validation, workspace shell with search and reference-person
selection, and focused graph rendering.

Outstanding: Native JSON v1, GEDCOM adapters, local-only privacy enforcement, the
10,000-person scale target, and first release preparation.

Kinship address terms (danh xưng) exist here only as a one-line post-MVP roadmap entry in
`brief.md`, with no specification and no regional-dialect concept. That work begins in
`v0.2`.
