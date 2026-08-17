<!-- snapshot: v0.2 | current | updated: 2026-08-17 -->

# Gia Phả — v0.2

Current source of truth. Adds the xưng hô specification to the v0.1 baseline.

## Contents

| File | Contents |
|---|---|
| `brief.md` | Product intent, audience, MVP boundary, confirmed post-MVP roadmap |
| `plan.md` | Delivery phases 0–4 |
| `context.md` | Target architecture, domain model, JSON/GEDCOM contracts, xưng hô specification |
| `decisions.md` | ADR-001 … ADR-013 |
| `tasks.md` | Executable backlog with acceptance criteria |
| `flow.md` | UX workflows, data flows, and diagrams for tree lifecycle, xưng hô resolution, branch profiles |
| `changelog.md` | History through 2026-08-17 |

## What changed from v0.1

Kinship address terms were a single post-MVP roadmap line with no specification. `v0.2`
gives them a four-stage design — path signature, seniority, branch membership, dialect
rendering — plus ADR-011 through ADR-013 and backlog items `XH-001` … `XH-006`.

The new part is regional: a branch profile carries a region and language, so one tree can
render a Quảng Trị paternal line, a Hà Nội maternal line, and a southern spouse's family in
their own registers at once. No competitor analysed in `reference/` does this.

## Where the work stands (2026-08-17)

Green across the whole CI order — lint, typecheck, 125 unit tests, production build, and 7
Playwright specs driving a real browser.

The xưng hô feature is **reachable and proven end to end**: paste a family, mark a reference
person, and every card carries the term that person uses, in that relative's branch dialect.
A Quảng Trị branch renders `mệ`, `o`, `bọ`, `mạ` where a northern branch renders `bà`, `bác`,
`bố`, `mẹ`.

- `XH-001`…`XH-004` engine and branch membership, joined by `XH-007`
- `XH-005` terms on the graph and side panel, `XH-006` relative list and invitation output,
  `XH-008` branch setup
- `DB-001` transactional bulk writes; `ENT-001`…`ENT-004` the two entry paths

Deferred to P2 by the founder on 2026-08-16: `IO-001` Native JSON and `IO-002` GEDCOM
export. Neither serves entering a tree by hand or printing an invitation list, and the
GEDCOM import half stays landed but unwired.

Still open and genuinely P0/P1: `PRIV-001` (a test proving no family data reaches the
network), `PERF-001` (10,000 people), `REL-001` (visible version and build SHA).

## Verified state of the codebase

Established by the scouting reports in `reference/reports/` and confirmed directly:

- The live application runs on the **v1 flat model** — `persons` plus `relationships` with
  `PARENT_OF` / `SPOUSE` / `EX_SPOUSE` / `ADOPTED_PARENT_OF`.
- Schema v2 (`family_unions`, `family_partners`, `family_children.birth_order`) exists in
  migrations but is **unused**: `src/db/families.ts` has no callers and those tables are
  absent from `src/db/types.ts`. `birth_order` is therefore a refinement, not a prerequisite.
- **No ego-to-target traversal exists.** `validation.ts` `hasDirectedPath` is a parent-only
  cycle check; `graph/layout.ts` `assignGenerations` records no path. `XH-001` builds new
  traversal rather than extending either.
- The reference person is `anchorPersonId` in the Zustand store, persisted and backed by the
  `is_anchor` column, whose declaration in `src/db/types.ts:31` already names danh xưng as
  its purpose.
- A real i18n dictionary mechanism exists at `src/i18n/{vi,en}.ts`, so dialect profiles
  extend it rather than introducing a second localization path.

## Scope note

GEDCOM (`IO-002`) is MVP, confirmed 2026-08-16 in ADR-015 after public release entered
scope. ADR-014 briefly deferred it and was superseded the same day. The `INDI`/`FAM` model
is the reference the domain model is designed against, so the adapter is not a retrofit.
