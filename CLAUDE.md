# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Read first

`.docs/README.md` is the entrypoint and source-of-truth map. The current version directory
(`.docs/v0.2/`) holds product intent, architecture, decisions, backlog, and history. Read
`.docs/v0.2/README.md` and the decisions relevant to your task before changing anything.

This mirrors `.agents/rules/rule.md`, which applies to every agent regardless of runtime.

## What this is

**Gia Phả** — an open-source, privacy-first family tree application for Vietnamese
families. The hosted site serves static assets only. All family data is created, queried,
and exported inside the browser. No account, no server-side family database, no telemetry.

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest unit tests
npm run test:e2e   # Playwright, requires a build + preview
```

CI runs lint → typecheck → test → build → e2e. Match that order locally before proposing a
change is finished.

## Architecture

Vite + React + TypeScript + Tailwind. SQLite WASM in a dedicated Worker with OPFS
persistence; one catalog database plus one isolated SQLite file per tree. React Flow for
viewport interaction with ELK in a Worker for layout.

```
src/
  app/         single-page shell (no router yet)
  components/  UI, with ui/ holding shadcn primitives
  db/          schema, migrations, worker, catalog, repositories
  graph/       layout and adjacency
  i18n/        vi/en dictionaries + useTranslation
  lib/         shared helpers
  store/       Zustand UI state
```

Layering: domain logic must not import UI, browser storage, or format-specific code.

## Things that will surprise you

- **Two data models coexist.** The live application uses the v1 flat model — `persons` plus
  `relationships` with `PARENT_OF` / `SPOUSE` / `EX_SPOUSE` / `ADOPTED_PARENT_OF`. Schema
  migration v2 added `family_unions`, `family_partners`, and `family_children`, but nothing
  calls `src/db/families.ts` and those tables are absent from `src/db/types.ts`. Do not
  assume v2 is wired up; check before relying on it.
- **`.next/`, `out/`, and `next-env.d.ts` are dead.** The project migrated to Vite; these are
  gitignored leftovers. There is no `next` dependency and no `next.config`.
- **The reference person is `anchorPersonId`** in the Zustand store, backed by the
  `is_anchor` column. Search selection sets `selectedPersonId`, which is a different thing.
- **i18n is real but incomplete.** `TreeCatalog.tsx` and `QuickAddForm.tsx` bypass the
  dictionaries with hardcoded Vietnamese strings, and `en.ts` lags `vi.ts`.

## Conventions

- Vietnamese is the default product language; English is supported through complete
  dictionaries rather than scattered conditionals. Preserve diacritics in user-facing text.
- Product prose may be Vietnamese; API names, schemas, and code identifiers stay English.
- Unknown values are null, never guessed. This matters most for kinship seniority, where a
  wrong `bác` versus `chú` is a social error — render `chưa rõ` instead.
- Migrations are numbered and transactional. A failed migration preserves the original file;
  it never wipes automatically.
- Nothing reaches the network at runtime. No CDN, no telemetry, no automatic error upload.

## Finishing a task

Update `.docs/v0.2/tasks.md` and append a `.docs/v0.2/changelog.md` entry with What, Why,
Impact, and References. Never describe TARGET or FUTURE behavior as CURRENT. Never edit a
frozen version directory such as `.docs/v0.1/`.
