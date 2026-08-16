<!-- snapshot: v0.2 | current | updated: 2026-08-16 -->

# Roadmap

`CURRENT`: the existing runtime is a legacy prototype. `TARGET`: the phases below replace it in the existing `gia-pha` repository; they do not describe completed behavior.

## Phase 0 - Documentation and validation

- [x] Review the legacy codebase and existing planning documents.
- [x] Lock product intent, privacy model, target audience, and open-source license.
- [x] Define target architecture, domain model, file formats, AI documentation rules, and backlog.
- [x] Align documentation with ADR-010: implement the target in the existing `gia-pha` repository, with no greenfield repository or rename.
- [x] Perform and record the read-only audit of VPS alias `j2`; deployment remains blocked by the documented header/administration constraints.

## Phase 1 - In-place foundation

- [x] Establish the FND-001 quality baseline in `gia-pha`: lint, typecheck, Vitest, production build, Playwright, and GitHub Actions.
- [x] Replace the Next/Turbopack build baseline with Vite, React, TypeScript, Tailwind, test tooling, and CI in `gia-pha`.
- Add local-only network policy, build metadata, error boundary, and opt-in diagnostic report.
- [x] Establish a SQLite WASM Worker with OPFS persistence checks and explicit capability failures.
- [x] Implement an OPFS SQLite catalog plus isolated tree files, with create, rename, open, and confirmed delete flows.

## Phase 2 - Core genealogy

- [x] Add versioned, transactional migrations for the domain schema, including unions, partners, children, dates, and provenance.
- [x] Validate self-links, duplicate memberships, dangling references, and parent ancestry cycles before relationship commits.
- Implement tree, person, family union, partner, child, and event repositories.
- Add transactions, constraints, migrations, cycle detection, and multi-tree isolation.
- Build workspace, onboarding, CRUD forms, search, reference-person selection, and responsive side panel.
- Render focused graph views using React Flow and ELK worker.

## Phase 3 - Interoperability

- Publish Native JSON v1 schema and lossless round-trip tests.
- Import GEDCOM 5.5/5.5.1/7; export GEDCOM 7 and compatibility-mode 5.5.1.
- Preserve unknown extensions and generate explicit compatibility/loss reports.
- Add branch selection, privacy filters, and plaintext export warnings.

## Phase 4 - Hardening and release

- Meet accessibility, browser, privacy, and 10k-person performance gates.
- Audit production artifact for external network dependencies.
- Decide deployment design from the VPS audit; deployment itself requires a separate approved task.

## Later roadmap

- PWA/offline installation, optional Drive sync, manual linked-source updates, reviewed merge/rollback, additional platform adapters, Vietnamese cultural modules, OCR, and media.

---

## Current plan — xưng hô delivery (2026-08-16)

`XH-001` … `XH-004` and the GEDCOM import half are landed and green. What follows is the
accepted plan for the next session.

### Phase A — join the branch layer to the engine (prerequisite)

The engine resolves a term for a pair; the branch layer knows which dialect profile applies.
Nothing connects them yet. Build the join that, given ego and a target, picks the target's
branch profile and calls `resolveAddress` with it, returning one resolution per branch when
a person belongs to several.

This also unlocks deep "gọi thay ngôi": when the target sits in a spouse-side branch,
recompute the signature with the spouse as ego and render in that branch's profile.

Depends on: `src/kinship/` and `src/db/branches.ts`, both landed.
Risk: the engine is pure and takes plain arrays, so the join owns loading and caching.

### Phase B — XH-005, surface terms in the workspace

Graph nodes and side panel show the term for the current `anchorPersonId`. Multi-branch
people show every applicable label. `UNKNOWN_SENIORITY` and `UNKNOWN_GENDER` render as
`chưa rõ` with an affordance to supply the missing field.

Depends on: Phase A.

### Phase C — XH-006, relative list and invitation output

Sortable, exportable table: real name, gọi, xưng, branch, unknown flags. Then the `formal`
register composed into printed invitation phrasing. This is the artifact the founder needs
for a wedding, and is the reason the feature is being built now.

Depends on: Phase A. Independent of Phase B and can run in parallel.

### Phase D — branch setup UI

`XH-004` shipped a repository with no interface. The user must be able to name a branch,
pick its region, choose root people, and manually assign anyone the derivation misses.
Without this the feature is unreachable from the app.

### Phase E — finish IO-002

GEDCOM export, plus wiring the landed import path to the database and an import preview
that shows the loss report before committing.

### Success criteria

Founder selects themselves as reference person, opens the relative list, and every relative
shows a correct gọi/xưng pair in that relative's branch dialect, or an explicit `chưa rõ`
where data is missing. No guessed seniority anywhere.

### Rollback

All work is additive: a new `src/kinship/` tree, a new `src/io/gedcom/` tree, one forward
migration, and new columns nothing else reads. Reverting the UI phases leaves the existing
app behaviour untouched.
