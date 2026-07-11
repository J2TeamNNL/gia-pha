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
