---
name: sql-js-browser-build-column-mangling
description: sql.js@1.14.0's browser build renamed db.exec() result's `columns` key to `lc` — broke all reads in real browser (as of 2026-08-22, may be fixed since)
metadata:
  type: project
---

**VERIFY THIS IS STILL TRUE BEFORE TRUSTING IT** — this describes a bug found
2026-08-22, reported to `main`/orchestrator for a fix in `src/db/persons.ts`.
It may already be fixed. Re-run the repro below or check
`plans/reports/tester-260822-0341-e2e-net.md` §3-4 for full details before
acting on this.

As of 2026-08-22: `sql.js@1.14.0`'s browser bundle
(`sql.js/dist/sql-wasm-browser.js`, the file Next.js/Turbopack resolves for
client bundles) returns `db.exec()` results with the `columns` property
renamed to `lc` (minifier property mangling) — the Node build
(`import initSqlJs from "sql.js"`) returns `columns` correctly. Confirmed by
running the exact same schema/insert/select through both builds in a plain
Node script (bypasses browser entirely).

**Why this mattered:** `src/db/persons.ts` `mapRows()` destructures
`const { columns, values } = result[0]`, so in a real browser `columns` is
`undefined` → `rowToObject()` throws → `getAllPersons()`/`getAllRelationships()`
always throw in browser → `FamilyTreeCanvas` shows the load-error screen right
after creating the first person, every time, in every real user session
(this is a static-export app, so this hits production too, not just dev).

**How to apply:** if a future e2e run fails immediately after onboarding with
`console.error: Lỗi tải dữ liệu: TypeError: Cannot read properties of
undefined (reading 'forEach')`, this is very likely the same bug (or a
regression of the same class) — don't spend time suspecting the test harness,
a stale `.next` cache, or concurrent-agent file edits first; check
`Object.keys(db.exec(...)[0])` in the actual resolved browser bundle before
anything else. See [[scout-block-bash-hook]] for how to run the isolating
repro script despite the `dist`-path Bash restriction.
