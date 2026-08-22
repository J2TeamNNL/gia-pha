# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Read first

`.docs/README.md` is the entrypoint and source-of-truth map. The current version directory
(`.docs/v0.2/`) holds product intent, architecture, decisions, backlog, and history. Read
`.docs/v0.2/README.md` and the decisions relevant to your task before changing anything.

This mirrors `.agents/rules/rule.md`, which applies to every agent regardless of runtime.

`docs/` exists alongside `.docs/` and which one is canonical is **not settled** — see
`docs/decisions.md`. Until it is, read both. `docs/` currently holds the Vietnamese genealogy
domain rules (`culture-vietnam.md`, read it before designing any field), the record of why this
stack was chosen (`decisions.md`), source attribution (`credits.md`), and the way into the
research under `plans/reports/` (`research-index.md`).

Two things in `credits.md` constrain what you may do: the lunar algorithm in
`src/lib/lunar-calendar.ts` keeps Hồ Ngọc Đức's arithmetic verbatim and its terms of use are
**unverified**, and the three projects cloned into `references/` carry no LICENSE, so they may
be read but never copied from.

## What this is

**Gia Phả** — an open-source, privacy-first family tree application for Vietnamese
families. The hosted site serves static assets only. All family data is created, queried,
and exported inside the browser. No account, no server-side family database, no telemetry.

## Commands

```bash
pnpm dev        # Vite dev server
pnpm build      # production build
pnpm lint       # ESLint
pnpm typecheck  # tsc --noEmit
pnpm test       # Vitest unit tests
pnpm test:e2e   # Playwright, builds and previews first
```

pnpm, not npm — `packageManager` in `package.json` pins the version. CI runs
lint → typecheck → test → build → e2e. Match that order locally before proposing a change is
finished.

## Architecture

Vite + React + TypeScript + Tailwind. SQLite WASM in a dedicated Worker with OPFS
persistence; one catalog database plus one isolated SQLite file per tree. The graph is a
hand-written SVG/DOM canvas (`src/components/GraphView.tsx`) over a plain layout Worker
(`src/graph/layout.worker.ts`) — there is no React Flow and no ELK dependency (ADR-018).

```
src/
  app/         single-page shell (no router yet)
  components/  UI, with ui/ holding shadcn primitives
  db/          schema, migrations, worker, catalog, repositories
  graph/       layout and adjacency
  i18n/        vi/en dictionaries + useTranslation
  io/          GEDCOM parser and spreadsheet-paste import
  kinship/     address terms, seniority, regional dialects
  lib/         shared helpers
  pwa/         service worker registration
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
- **A family's only copy may still live in IndexedDB.** The sql.js build stored the whole
  database as one IndexedDB blob; this build reads OPFS. `src/db/legacy-indexeddb.ts` recovers
  those trees, and `importLegacyIndexedDbTreeIfNeeded()` runs during worker init. Reordering or
  short-circuiting that init silently hands an existing family an empty canvas. The IndexedDB
  original is deliberately never deleted, so the import stays retryable.
- **Never rebuild `partial_dates`.** Five foreign keys reference it with `ON DELETE SET NULL`,
  so dropping it to attach a CHECK constraint blanks every date reference in the file.
  `PRAGMA defer_foreign_keys` defers the *check*, not the `SET NULL` *action*. That is why
  migration v6 adds `is_leap_month` through ADD COLUMN plus triggers.
- **More code is written than is reachable.** Beyond `families.ts`: `src/io/gedcom/` (a full
  GEDCOM parser with a loss report) and `src/lib/lunar-calendar.ts` plus the `is_leap_month`
  column have tests but no UI calls them. Wiring one up is a feature, not a fix.
- **`schema.test.ts` proves nothing about SQL.** It drives `applyMigrations` through a recording
  executor, so it only checks statement order. `schema.engine.test.ts` runs the migrations on a
  real engine (`node:sqlite`), including a sql.js-shaped file. New migrations need a test there.
- **A tree is a forest.** Persons unreachable from the focus keep their own generations and are
  exempt from the "generations shown" filter, which measures distance from the focus and says
  nothing about another component. See `src/graph/layout.ts`.
- **Vitest excludes `references/`.** Those are competitor repositories cloned for study and
  gitignored; without the exclude their suites run and fail locally while CI stays green.

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
