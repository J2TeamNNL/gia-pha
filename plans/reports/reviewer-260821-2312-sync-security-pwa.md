# Reviewer — Sync, Security, Privacy & PWA Readiness

Date: 2026-08-21 · Scope: read-only review, no project file modified
Branch `main`, working tree dirty (`.plan/plan.md`, `src/app/page.tsx`, `src/components/{FamilyTreeCanvas,PersonCard,QuickAddForm}.tsx`, `src/db/persons.ts`, `package.json` modified; `package-lock.json` deleted; `.claude/`, `pnpm-lock.yaml` untracked)

Verification run: `pnpm build` PASSES (Next 16.1.6, static export, 4 pages). `pnpm lint` FAILS — 12 errors. Real output in M9.

---

## Verdict

**Not shippable as a data-custody product.** The code quality is decent for v0.5, and the privacy posture *today* is genuinely clean (no analytics, no CDN, fonts self-hosted at build time, WASM served from own origin — verified). But the durability story is the worst possible combination for irreplaceable data:

- one copy of the data, in the most evictable storage tier a browser offers,
- `navigator.storage.persist()` never requested,
- zero export/backup escape hatch anywhere in the UI,
- an automatic, unconfirmed, unrecoverable **wipe** path that fires on a 5-column heuristic,
- a second destruction path where a transient IndexedDB open failure causes an **empty** database to be written over the real one,
- concurrent saves that can commit a **stale** full-DB snapshot last, dropping records,
- a global `window.__giapha.seed()` in production whose first two statements are `DELETE FROM relationships; DELETE FROM persons`,
- and no service worker / manifest, so iOS users cannot even install to escape WebKit's 7-day script-writable-storage eviction.

Drive sync does not exist (`src/lib/drive.ts` is 18 lines of `console.log`), so the "your data is safe on your own Drive" promise in `README.md:7` is currently unbacked. That is fine as a roadmap; it is not fine that there is no interim backup at all.

**Blocking before any further feature work:** C1, C2, C2b, C3, H1, H4, H4b. These are cheap — roughly two days total, mostly in `src/db/client.ts` — and each one independently prevents a user from permanently losing four generations of family history. Everything in v0.5/v0.6 (`.plan/plan.md:98-110`) is worth less than these seven fixes.

One scope correction, independent of the bugs: the documented "background sync" (`.plan/plan.md:127`, `.plan/01-architecture.md:51`) is **not deliverable** in a browser-only app with no backend — see H7. Sync must be foreground-only. Better to settle that before v0.7 is planned than after it is built.

Also: `README.md:8` and `.plan/01-architecture.md:9-10,37` state PWA/offline/service-worker as present. They are absent. Fix the docs or the code, but the current text is a false claim to users.

No secrets found. `.agent/mcp_config.json` holds only the literal placeholder `YOUR_API_KEY` (`<redacted>` per policy — it is a placeholder, not a credential) and is untracked + covered by `.gitignore:44`. A broad grep for `client_secret|api[_-]?key|AIza|GOCSPX|ya29.|apps.googleusercontent.com|Bearer|sk-|ghp_|xoxb-` across all tracked source returned nothing.

---

## Data Loss Risk Register

| # | Scenario | Likelihood | Impact | Present mitigation | Recommended mitigation |
|---|---|---|---|---|---|
| 1 | Schema check fails after a future release → `clearIndexedDB()` deletes the whole tree (`src/db/client.ts:29-36`) | **High** (guaranteed the first time a column is added/renamed; `isSchemaValid` checks only 5 columns and ignores `relationships` entirely) | **Total, irreversible** | `console.warn` only | Never wipe. Rename old blob to `main.bak.<ts>`, keep last 5, real migrations via `PRAGMA user_version` + `ALTER TABLE`, recovery UI |
| 2 | User clears site data / "Clear browsing data" / uninstalls PWA | Medium | Total | None | Export/import file, then Drive sync; warn on first run that data is browser-local until Drive is connected |
| 3 | iOS Safari deletes IndexedDB after 7 days without site interaction (WebKit script-writable storage cap) | **High** for casual users; app is *not installable*, so the Home-Screen exemption is unavailable | Total | None | Ship manifest + icons + SW so iOS users can install; call `navigator.storage.persist()`; nag to export |
| 4 | Browser evicts best-effort storage under disk pressure | Medium | Total | None | `navigator.storage.persist()` + surface `estimate()` usage |
| 5 | Private/Incognito session | Medium | Total on tab close | None | Detect (`persist()` denied / `estimate()` quota tiny) and refuse to accept data entry without an export path |
| 6 | `window.__giapha.seed()` invoked (devtools, bookmarklet, extension, or XSS) → `DELETE FROM persons` (`src/app/page.tsx:19-21` → `src/db/persons.ts:160-163`) | Low-Medium | Total, irreversible | None | Dev-only guard + typed confirmation |
| 7 | Two tabs open; each holds its own in-memory DB and writes full-blob snapshots to the same IDB key (`src/db/client.ts:85-94`) | **Medium-High** (phone + laptop, or two tabs — normal for a family app) | Partial-to-total loss of one tab's session | None | Web Locks around read-modify-write + `BroadcastChannel` invalidation |
| 8 | `getDb()` async-singleton race → write lands on an orphaned DB instance, `saveDb()` persists the other one (`src/db/client.ts:10-45`, triggered by `Promise.all` at `src/components/FamilyTreeCanvas.tsx:136`) | **High** in dev (`reactStrictMode: true`), Medium in prod | Silent loss of individual records | None | Memoize the in-flight promise |
| 9 | `QuotaExceededError` on save; user keeps editing, refreshes | Medium (blob grows, quota shrinks under pressure) | Everything since the first failed save | Error string shown only inside the add form (`src/components/QuickAddForm.tsx:134-136`); swallowed to `console.error` on the load path (`src/components/FamilyTreeCanvas.tsx:139-141`) | Global "NOT SAVING" banner + forced export |
| 10 | Partial mutation: `deletePerson` / multi-step add commits per statement, no transaction (`src/db/persons.ts:112-119`, `src/components/QuickAddForm.tsx:76-129`) | Medium | Corrupt graph (orphan person, one-way SPOUSE) | None | `BEGIN`/`COMMIT`/`ROLLBACK`, one save |
| 11 | `sql.js` npm resolves newer than the hand-vendored `public/sql-wasm.wasm` → `initSqlJs` aborts, DB unopenable (`package.json:24` `^1.14.0`, no lockfile committed for pnpm, no copy step) | Medium | Data intact but inaccessible until reverted | `pnpm-lock.yaml` pins 1.14.0 — but it is **untracked** | Pin exactly, commit `pnpm-lock.yaml`, drop `package-lock.json` from git, copy WASM in a `prebuild` script |
| 12 | (Future) Two devices edit offline → last-write-wins blob overwrite on Drive | High once sync ships | Silent loss of one device's edits | N/A (sync unimplemented) | See Recommended Sync Design |
| 13 | (Future) Upload interrupted / retried, local state marked "synced" when it is not | Medium | Divergence, later silent overwrite | N/A | Resumable upload only (an abandoned session leaves the old file intact — see Codex C15), persist the session URI, verify `size`/`sha256` from the completion response **before** marking synced |
| 14 | A transient `openIDB()` failure returns `null` → a fresh **empty** DB is `put` over the existing key (`src/db/client.ts:20-42`, `:80-82`) | Medium | **Total, irreversible** | None — the failure is swallowed by `catch { return null }` | Assert the key is absent before the first write; never downgrade a read failure to "no data" |
| 15 | Two overlapping `saveDb()` calls commit the older snapshot last (`src/db/client.ts:85-94`, one connection per call) | **High** (the add-relative flow issues 3 saves per click) | Loss of individual records | None | Serialize export+write in one critical section, one cached connection |
| 16 | (Future) First sync from two devices each creates its own file — Drive allows duplicate names in `appDataFolder` | Medium | Permanent fork; one tree becomes invisible | N/A | Store `db_id`/`fileId` in the blob's `meta`; on startup list `appDataFolder` and reconcile/merge duplicates instead of trusting a name |
| 17 | (Future) User removes app access in Google account settings → `appDataFolder` contents deleted | Low-Medium | Total remote loss | N/A | `appDataFolder` is not a backup: keep the local file export as the real recovery path |

---

## Findings

### CRITICAL

**C1 — Automatic, silent, unrecoverable destruction of the user's entire family tree.**
`src/db/client.ts:23-37` — if `isSchemaValid()` returns false, the code calls `clearIndexedDB()` and creates an empty DB, logging only `console.warn` (`client.ts:31-33`). `src/db/schema.ts:56-65` decides validity from `PRAGMA table_info(persons)` containing exactly 5 columns (`id, first_name, gender, is_living, is_anchor`) and **never inspects `relationships` at all**. `src/db/schema.ts:2-4` documents the intent openly: *"Uses DROP + CREATE… Migration of existing data is a future concern — for MVP we wipe and recreate."*

Failure scenario: v0.6 ships `title_prefix` as required, or renames `is_anchor`, or a save is interrupted mid-`put` leaving a byte range sql.js can't read. Every existing user opens the app, sees a friendly 🌳 "empty tree" screen (`src/components/FamilyTreeCanvas.tsx:372-388`), and four generations of ancestors are gone. Nothing tells them data was destroyed — they will assume a bug and keep clicking, guaranteeing the old blob is never recovered. A corrupt-blob variant also loses a *valid* DB whose `relationships` table is missing, since that table is never checked.

Fix: delete the wipe branch. On a schema mismatch, (a) copy the existing bytes to key `main.bak.<epoch>` (keep last 5), (b) run real migrations keyed off `PRAGMA user_version` with `ALTER TABLE ADD COLUMN`, (c) if migration genuinely fails, block the UI with an explicit "we could not open your data — download it now" screen that hands the user the raw `.sqlite` file. Never destroy the only copy of user data without a typed confirmation.

**C2 — No backup or export escape hatch exists, and the single storage tier is explicitly evictable.**
Grep across `src/` for `download|Blob|createObjectURL|showSaveFilePicker|toDataURL` returns **nothing**. Grep for `navigator.storage|persist()|estimate(` returns **nothing**. `src/db/client.ts:85-94` is the only persistence: an IndexedDB `put` into best-effort (evictable) storage. `src/lib/drive.ts:11-13` is a `console.log` stub, so there is no cloud copy either.

That means: WebKit's 7-day cap on script-writable storage for non-installed sites, Chrome's eviction under disk pressure, Private mode, and one accidental "Clear browsing data" each result in **total, unrecoverable loss** — with no way for the user to have made a copy even if they wanted to.

Fix, in this order, before any other feature: (1) "Tải xuống bản sao (.sqlite)" button — `new Blob([db.export()])` + object URL, ~15 lines; (2) "Phục hồi từ tệp" import that validates with `PRAGMA integrity_check` and backs up the current blob first; (3) `await navigator.storage.persist()` on first successful write, and surface the boolean — if denied, say so plainly; (4) show `navigator.storage.estimate()` usage; (5) first-run notice: data lives in this browser until Drive is connected.

**C2b — A fresh empty database is written over the existing key unconditionally.** *(surfaced by the Codex cross-review, then verified)*
`src/db/client.ts:20-42`: `const saved = await loadFromIndexedDB()` → if `saved` is falsy the code falls through to `dbInstance = new SQL.Database(); initDatabaseSchema(...); await persistDb(dbInstance)` — and `persistDb` does `put(data, "main")`, **overwriting whatever is at that key**. No `clearIndexedDB()` needed; the empty-DB write alone destroys the tree.

That makes every path producing a false `null` a data-destruction path. And there is one: `loadFromIndexedDB` (`client.ts:71-83`) wraps `await openIDB()` in `try { … } catch { return null }` — a transient `openIDB` failure (Firefox private mode, a `SecurityError`, a transient `UnknownError`, storage pressure) is silently downgraded to "the user has no data". If the *next* `openIDB` inside `persistDb` succeeds, the empty DB lands on top of the real one.

Note the subtlety in the same function: because it does `return new Promise(...)` rather than `return await`, a rejection from `req.onerror` is *not* caught by that `catch` (per spec, the adopted promise settles outside the `try`), so a failed `get` correctly propagates and rejects `getDb()`. It is specifically the `openIDB` failure path that silently becomes "no data". Fixing one without the other leaves the hole open.

Fix: never write a fresh DB to an occupied key. Distinguish three states — *key absent* (safe to initialize), *key present and readable*, *read failed* (abort with an error; do **not** initialize). Assert absence with an explicit `get` result of `undefined` before the first `put`, and remove the blanket `catch { return null }`.

**C3 — Production-shipped global that destroys all data with no confirmation.**
`src/app/page.tsx:19-21`:
```ts
useEffect(() => {
  (window as any).__giapha = { seed: seedDemoData };
}, []);
```
`seedDemoData` (`src/db/persons.ts:160-163`) opens with `DELETE FROM relationships; DELETE FROM persons`, inserts 14 demo people, then `await saveDb()` (`persons.ts:257`) — committing the destruction. This is reachable from devtools, any bookmarklet, any browser extension with content-script access, and from any XSS (see H5). There is no confirm, no backup, no undo.

Fix: `if (process.env.NODE_ENV !== "production")` guard, and require a typed phrase before wiping. Also the `any` here is 1 of the 12 lint errors (M9).

---

### HIGH

**H1 — Async-singleton race in `getDb()` silently drops writes.**
`src/db/client.ts:10-45`: the guard `if (dbInstance) return dbInstance` is at line 11, but `dbInstance` is not assigned until line 27 or line 40 — after **four** awaits (`import("sql.js")`, `initSqlJs`, `import("./schema")`, `loadFromIndexedDB`). `src/components/FamilyTreeCanvas.tsx:136` calls `Promise.all([getAllPersons(), getAllRelationships()])`, and both go through `getDb()`. Two callers therefore both pass the guard and each construct an independent `SQL.Database`.

Concrete loss: caller A holds instance α and runs `db.run(INSERT …)` on it; caller B finished later and set `dbInstance = β`. `saveDb()` (`client.ts:47-50`) persists **`dbInstance`**, i.e. β — which never saw the insert. The record vanishes on reload. `reactStrictMode: true` (`next.config.ts:4`) double-invokes effects in dev, so `loadData` fires twice → up to four concurrent initializations. The orphaned instance is also never `.close()`d, leaking a full WASM heap. This is very likely the same defect class as the *"Sửa lỗi NOT NULL constraint và SQLite Caching bug"* / *"Empty Tree (sql.js minification bug)"* entries at `.plan/plan.md:81-82` — a symptom was patched, not the race.

Fix (5 lines): cache the *promise*, not the result.
```ts
let dbPromise: Promise<Database> | null = null;
export function getDb() { return (dbPromise ??= initDb()); }
```

**H2 — Multi-tab last-write-wins destroys a whole editing session.**
Each tab has its own module-level `dbInstance` (`src/db/client.ts:8`) and each `persistDb` writes a **full snapshot** to the same key `"main"` (`client.ts:85-94`). No Web Locks, no `BroadcastChannel`, no `onversionchange` handler. Tab A adds five relatives; tab B (opened earlier, stale in-memory copy) edits one note; B's save overwrites the key and A's five relatives are gone. There is no detection and no warning. For a family app this is a normal usage pattern, not an edge case — and it is the same conflict shape you will hit on Drive, so solving it now pays twice.

Fix: `navigator.locks.request("gia-pha-db", …)` around load-mutate-save, plus a `BroadcastChannel("gia-pha")` message after each save so other tabs reload; or elect a single writer tab. Minimum viable: store a monotonic `write_seq` in the blob, and refuse to save if the stored `write_seq` moved since you loaded.

**H3 — `openIDB()` has no `onblocked` handler and never closes connections → permanent hang on the first IDB version bump.**
`src/db/client.ts:58-69` handles `onupgradeneeded`, `onsuccess`, `onerror` — but not `onblocked`. Every `persistDb` / `loadFromIndexedDB` / `clearIndexedDB` call opens a *new* connection (`client.ts:87`, `:72`, `:98`) and none of them ever `close()`. Today: an unbounded connection leak. The day you bump `indexedDB.open(DB_NAME, 2)`, any other open connection (including the leaked ones and other tabs) causes `blocked` to fire — and since neither `onsuccess` nor `onerror` ever fires, the returned promise **never settles**. `getDb()` hangs forever; the user sees a blank canvas with no error and no timeout.

Fix: cache one connection, add `req.onblocked = () => reject(new Error(...))` with an actionable message ("close other tabs"), and set `idb.onversionchange = () => idb.close()`.

**H4 — Save failures are invisible; the user keeps typing into a database that is no longer persisting.**
`persistDb` rejects on `tx.onerror` (`src/db/client.ts:92`), which includes `QuotaExceededError`. That rejection surfaces only as a red string inside the add-member form (`src/components/QuickAddForm.tsx:134-136`) or is swallowed into `console.error` on the load path (`src/components/FamilyTreeCanvas.tsx:139-141`). There is no global "changes are not being saved" state, no retry, no forced export. A user can spend an hour entering a lineage while every write silently fails, then refresh and lose all of it.

Fix: a store-level `persistenceHealthy` flag; on first failure show a non-dismissable banner and immediately offer the file export from C2. Also add `tx.onabort`.

**H4b — Concurrent saves can commit an older snapshot after a newer one.** *(surfaced by the Codex cross-review, then verified)*
`src/db/client.ts:85-94`:
```ts
const data = db.export();      // snapshot taken at time T
const idb = await openIDB();   // async gap — a NEW connection every call
return new Promise(... tx = idb.transaction(STORE, "readwrite"); put(data, "main") ...);
```
Because each `persistDb` call opens its **own** connection, the ordering of the two `readwrite` transactions is decided by whichever `openIDB()` resolves first — not by which snapshot is newer. Two overlapping `saveDb()` calls (trivially produced by `QuickAddForm`'s createPerson → createRelationship → createRelationship chain, M2) can therefore commit the *stale* full-DB export last, silently discarding the newer record. Full-blob snapshots make this lossy rather than merely out-of-order.

Fix: serialize the whole export-and-write through a single promise chain or `navigator.locks`, take the snapshot *inside* the critical section, and reuse one cached IDB connection.

**H5 — Stored-XSS sink: unvalidated user URL rendered into `href`.**
`src/components/SidePanel.tsx:148-155` renders `<a href={value} target="_blank" rel="noopener noreferrer">` where `value` is the user-entered `fb_link` (`SidePanel.tsx:107-113`). React does **not** sanitize URL attributes — it emits a dev-time warning only and has never shipped blocking, so a `javascript:` or `data:text/html` value executes on click in the app's own origin ([React 16.9 warning, still not enforced](https://github.com/facebook/react/issues/16592)).

Threat-model calibration: **today this is essentially self-XSS** (the only data source is the user's own keyboard) — Low real risk. It becomes a genuine High the moment either roadmap item lands: v0.7 CSV/GEDCOM import (`.plan/plan.md:114`) makes the data attacker-supplied, and the V3 shared-Drive family social feed (`README.md:19`) makes it another person's input. And once Drive OAuth tokens live in this origin (below), an XSS is not a defacement — it is exfiltration of the entire family database plus the Drive token. Fix cost is ~8 lines, so fix it now rather than tracking it.

Fix: `const ok = (u) => { try { return ["http:","https:"].includes(new URL(u).protocol); } catch { return false; } }` — render plain text otherwise. Enable `react/jsx-no-script-url` in `eslint.config.mjs`. Apply the same check to the planned `zalo_link` (`src/db/types.ts:24`) and the Google Maps address link.

**H6 — No CSP anywhere, and `output: "export"` means `next.config.ts` cannot provide one.**
`next.config.ts:1-5` sets only `output: "export"` and `reactStrictMode`. Static export has no server, so `headers()` in `next.config` is unsupported — CSP must come from the hosting layer (Vercel `vercel.json`, Netlify/Cloudflare `_headers`, nginx) or, as a weaker fallback, a `<meta http-equiv="Content-Security-Policy">` in `src/app/layout.tsx`. There is currently neither. That removes the only second line of defense behind H5, and leaves `connect-src` wide open — an injected script can POST the whole DB anywhere.

Fix: commit the header file alongside the code so it cannot be forgotten at deploy time. Starting point:
`default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://accounts.google.com; connect-src 'self' https://www.googleapis.com https://oauth2.googleapis.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; frame-src https://accounts.google.com; frame-ancestors 'none'; base-uri 'none'; object-src 'none'`.
Note `'wasm-unsafe-eval'` (not blanket `'unsafe-eval'`) is what sql.js needs — verify against your target browser matrix. Google Identity Services also needs `Cross-Origin-Opener-Policy: same-origin-allow-popups` for its popup flow; check your host supports setting it.

---

**H7 — The planned "background sync" is not deliverable in a no-backend browser app.** *(surfaced by the Codex cross-review)*
`.plan/plan.md:127` specifies *"Trigger một tiến trình ngầm (background sync) để upload/update file dữ liệu ngược lại lên Google Drive"* and `.plan/01-architecture.md:51` specifies *"Silent Upload ghi đè lên file trên Google Drive"* after a debounce timer.

A browser-only public OAuth client cannot hold a durable refresh token: Google's "Web application" client type requires a client secret at the token endpoint, and the GIS token flow issues only a short-lived (~1h) access token tied to the user being present. There is no backend to do the code-for-refresh-token exchange, and that is a locked constraint. Consequently: no unattended sync, no Service-Worker Background Sync (the SW would have no valid token), and no reconciliation while the app is closed.

This is a **scope correction, not a bug** — but it invalidates a documented design and must be settled before v0.7 is planned. Deliverable model: **foreground sync only** — sync on app open, on `visibilitychange` → hidden, and on an explicit "Sync now"; access token in memory; silent re-auth via `prompt=none`; and an honest, always-visible status chip (`Đã lưu máy / Chờ đồng bộ / Đã đồng bộ / Xung đột`). Calendar reminders are unaffected: events created while the user is authorized are delivered by Google Calendar itself, no background process required.

### MEDIUM

**M1 — Hand-rolled SQL escaping instead of the prepared statements sql.js already provides; column-name interpolation is a latent injection.**
`src/db/persons.ts:36-41` defines `escapeSql`, used for every statement (`:48-66`, `:88`, `:102-108`, `:114-117`, `:135`, `:200-221`).

- **Values: not exploitable — theoretical non-issue.** SQLite string literals require only `'` doubling and support no backslash escapes, so `String(val).replace(/'/g, "''")` is correct for the value position. Do not inflate this.
- **Real defect:** `updatePerson` (`src/db/persons.ts:102-104`) builds `` `${k} = ${escapeSql(v)}` `` from `Object.entries(data)` — the **column name** is interpolated with no allow-list. Currently latent: grep confirms nothing imports `updatePerson`/`deletePerson` from `@/db/persons` (only `getAllPersons`, `getAllRelationships`, `setAnchorPerson`, `createPerson`, `createRelationship`, `seedDemoData` are imported). v0.6's "Form thêm người" (`.plan/plan.md:107`) will wire it up, at which point any key that reaches it from a form/import controls SQL.
- **Also real:** `escapeSql` returns `val.toString()` for numbers (`persons.ts:39`), so `NaN`/`Infinity` — trivially produced by a cleared `<input type="number">` — emit literal `NaN` and throw mid-statement, with no transaction to roll back (M2).

Fix: use `db.run(sql, params)` / `db.prepare(...).bind(...)` — sql.js supports binding natively, so `escapeSql` is a reimplementation of an existing dependency facility. Validate update keys against a `const COLUMNS = [...] as const` allow-list. Reject non-finite numbers at the form boundary with `zod` (already a dependency, `package.json:27`, but unused for these fields).

**M2 — No transactions around multi-statement mutations.**
`deletePerson` (`src/db/persons.ts:112-119`) runs the relationships delete and the person delete as two independent statements. `QuickAddForm` (`src/components/QuickAddForm.tsx:76-129`) performs `createPerson` → `createRelationship` → `createRelationship`, each of which calls `saveDb()` independently (`persons.ts:80`, `:137`). A failure or a closed tab between steps leaves a person with no relationship, or a spouse pair with only one direction of the `SPOUSE` edge (the code deliberately writes both, `QuickAddForm.tsx:108-117`). It also means **three full `db.export()` + IDB writes for one "add relative" click**.

Fix: `db.exec("BEGIN")` / `COMMIT` / `ROLLBACK` around the unit of work, `saveDb()` once at the end.

**M3 — Full-blob write amplification on every mutation.**
`src/db/client.ts:85-94`: `db.export()` serializes the *entire* database and rewrites the whole IDB value per mutation. Fine at 14 rows; a 2,000-person clan with biographies is multiple MB, copied and rewritten on every save. Combined with M2 that is ~3 full rewrites per added relative.

Fix: debounce (500ms–2s) with a flush on `visibilitychange`/`pagehide`, and skip the write when no rows changed. Build this now — the same debounced blob is exactly the unit you will ship to Drive, so it is not throwaway work.

**M4 — Vendored WASM can drift from the JS that loads it.**
`public/sql-wasm.wasm` is a hand-copied 659,734-byte binary (mtime Feb 28, sha256 `9125e039…f6f6`, and it carries mode 755 — an executable bit on a web asset, cosmetic). `src/db/client.ts:15` loads it via `locateFile: () => "/sql-wasm.wasm"`. `package.json:24` allows `sql.js: ^1.14.0` and there is **no copy/`prebuild` step** (verified: `package.json` scripts are only `dev`/`build`/`start`/`lint`). `pnpm-lock.yaml` pins `sql.js@1.14.0` but is **untracked**, while the tracked `package-lock.json` is deleted in the working tree. A clean clone + install can therefore resolve a newer sql.js against the stale WASM → `initSqlJs` aborts → every user's database is unopenable until someone notices.

Fix: pin `sql.js` to an exact version, commit `pnpm-lock.yaml`, `git rm --cached package-lock.json`, and add `"prebuild": "cp node_modules/sql.js/dist/sql-wasm.wasm public/"` so the binary can never diverge. Add `*.wasm binary` to `.gitattributes` while you are there (see L4).

**M5 — Absolute WASM path breaks any sub-path deployment.**
`src/db/client.ts:15` returns the root-absolute `"/sql-wasm.wasm"`. Deployed to GitHub Pages (`/gia-pha/`) or any sub-path with `basePath`, that 404s and the app is bricked with an opaque WASM error — and, because there is no `catch` around `initSqlJs`, no user-visible message. Fix: derive from `process.env.NEXT_PUBLIC_BASE_PATH`/`assetPrefix`, or use a relative URL; and wrap init in a try/catch that renders an actionable error.

**M6 — Privacy leak vs the README promise: remote avatar URLs.**
`src/components/PersonCard.tsx:137-143` renders `<img src={person.avatar_url}>` for any URL the user pastes. Every render makes the viewer's browser hit a third-party host, leaking IP, user-agent, and (absent `referrerPolicy`) the referring URL — and the image is unavailable offline, breaking `.plan/01-architecture.md:9`. `README.md:7` and `.plan/01-architecture.md:8` promise that no family data touches a third party the user does not control; an avatar hotlink is a per-view beacon to an arbitrary server.

Fix: restrict avatars to file-upload → bytes stored in the SQLite blob (or Drive/Photos once integrated). Interim: `referrerPolicy="no-referrer"` + `loading="lazy"` + CSP `img-src 'self' data: blob:`.

*Calibration — the rest of the privacy posture is genuinely clean and worth protecting:* no analytics, no error reporting, no CDN. `next/font` self-hosts Geist at build time (verified: the only external URL in `out/index.html` is the `www.w3.org/2000/svg` namespace; fonts are present as `out/_next/static/media/*.woff2`), and the sql.js WASM is served from the app's own origin, not a CDN. Grep for `https?://` across `src/` returns nothing but SVG namespaces. That is a real differentiator — add a CI check (grep the build output for external origins) so it does not silently regress.

**M7 — PWA: nothing is implemented.** See the PWA Gap Checklist. The material point beyond the feature gap: **no install → no iOS storage-eviction exemption**, which makes C2 materially worse for exactly the audience (family members on iPhones) this app targets. And `README.md:8` / `.plan/01-architecture.md:9-10,37` currently assert PWA/offline/service-worker as existing behavior.

**M8 — Repo hygiene: `.claude/` is neither tracked nor ignored, and contains a nested git worktree.**
`grep claude .gitignore` → no match. `.claude/worktrees/flamboyant-moser/` is a full duplicate source tree. Consequences: (a) `git add -A` would commit local agent state and a duplicated codebase; (b) `pnpm lint` already walks it and reports the same 6 errors twice (see M9's doubled output) — every future lint/typecheck/test run does double work on a stale copy. Separately, `test-exec.js` **is tracked** (`git ls-files`) — a scratch script that `require()`s a `node_modules` path and accounts for 2 of the 12 lint errors.

Checked and correct: `/out/`, `/.next/`, `.DS_Store`, `*.tsbuildinfo`, `.env*`, `*.pem`, and `.agent` are all covered by `.gitignore`, and `git ls-files` confirms none of them is tracked.

Fix: add `.claude/` to `.gitignore`; `git rm --cached test-exec.js` (or move to `scripts/` and add an eslint ignore).

**M9 — `pnpm lint` fails; `pnpm build` passes. CI that only builds is green while lint is red.**
Real output (12 errors, 6 unique — duplicated because of M8):
```
.claude/worktrees/flamboyant-moser/src/db/persons.ts  28:31, 76:17, 90:17, 146:31  no-explicit-any
.claude/worktrees/flamboyant-moser/test-exec.js       1:13   no-require-imports
src/app/page.tsx                                      20:16  no-explicit-any
src/db/persons.ts                                     28:31, 76:17, 90:17, 145:31, 209:73  no-explicit-any
test-exec.js                                          1:13   no-require-imports
✖ 12 problems (12 errors, 0 warnings)
```
Next 16 no longer runs ESLint during `next build`, so this is invisible to a build-only pipeline. Note `src/db/persons.ts:28-29` — `rowObj.columns || rowObj.lc` — is defensive paranoia around the minification bug logged at `.plan/plan.md:82`; the `any` cast hides a real contract question (sql.js's types declare `columns`, and `lc` is a minified internal). Pin the sql.js version (M4) and delete the fallback, or document why the internal name is load-bearing. There are also two `eslint-disable` suppressions in `src/db/schema.ts:6,55` covering `db: any` — type those as `Database` from `sql.js`, which is already a devDependency (`package.json:35`).

---

### LOW

**L1** — `package.json:8` `"start": "next start"` cannot work with `output: "export"` (Next refuses to serve an exported app). Replace with a static server, e.g. `npx serve out`.

**L2** — `next.config.ts` does not set `images: { unoptimized: true }`. The codebase currently sidesteps `next/image` with a raw `<img>` plus an eslint-disable (`src/components/PersonCard.tsx:138`); the first real `next/image` usage will fail the export build.

**L3** — Dead auth affordance. `src/app/page.tsx:70-90` renders a full Google-branded "Sign in with Google" button with **no `onClick`**, and `src/lib/drive.ts:1-18` is three `console.log` stubs (`initGoogleAuth`, `syncDatabaseToDrive`, `fetchDatabaseFromDrive` — the last returns `null`). A user reasonably concludes their data is being synced when nothing is. Either disable it with a "coming soon" state or wire it up. (Positive side effect: this is why there is no client ID in the repo, so there is nothing to leak yet — get the storage decision in place *before* that changes.)

**L4** — `.gitattributes` is one line: `* text=auto`. **Theoretical non-issue** for `public/sql-wasm.wasm` and `src/app/favicon.ico`: Git's binary heuristic keys on NUL bytes in the first 8KB, and a `.wasm` file literally starts with `\0asm`, so no CRLF mangling occurs. Still worth pinning explicitly (`*.wasm binary`, `*.ico binary`) so it cannot regress on a contributor's Windows checkout — the failure mode if it ever did is a corrupted WASM and a dead app.

**L5 — CCCD / national-ID scanning (`README.md:16`, `.plan/01-architecture.md:56`) — proportionate but real.**
A 12-digit CCCD number stored next to full name, DOB, phone and home address is a complete identity-theft kit, and Vietnam's PDPD (Decree 13/2023/ND-CP) treats ID numbers as personal data requiring consent and a lawful basis. The distinguishing factor here is that the app collects data about **third parties** — living relatives, minors, and the deceased — who never consented, and there is no backend, so there is also no way to honor a deletion request centrally.

Concrete guardrails, cheapest first:
1. **Do not persist the number.** OCR to autofill name/DOB/gender, then discard the number and the image. This costs nothing and removes the entire liability class.
2. If it must be stored: last-4 only, or encrypt the field with a WebCrypto AES-GCM key derived (PBKDF2/Argon2) from a user passphrase that is **not** stored in the same blob — otherwise "encrypted at rest" is theater once the blob is on Drive.
3. **OCR must be on-device.** `.plan/01-architecture.md:56` still lists Google Cloud Vision as a candidate; that would upload images of Vietnamese national ID cards to Google and directly contradict `README.md:7`. Use `tesseract.js`, and say so in the README.
4. Explicit per-person consent copy, plus a "what this app stores about your family" screen.
5. Never put an ID number (or a full name + DOB) into a Drive **filename** or a Google **Calendar event summary** — Calendar entries sync to phones, wearables, and any third-party calendar client the user has authorized, which quietly re-exports family data outside the privacy boundary. This applies to the death-anniversary reminders in `README.md:17` regardless of CCCD.

**L6 — Split-brain state across two storage systems.** `src/store/treeStore.ts:97-105` persists `anchorPersonId` and `isOnboarding` to **localStorage** (zustand `persist`) while the tree itself lives in IndexedDB. Independent lifetimes: after a C1 wipe or a partial eviction, `isOnboarding` stays `false`, so `showOnboarding` (`src/app/page.tsx:16`) is false and the user lands on the "empty tree" screen with no hint that anything was lost, and no onboarding path back. Reconcile on boot: if the DB is empty but `anchorPersonId` is set, that is a data-loss signal — say so and offer restore-from-file.

---

## Recommended Sync Design

Minimal, no backend, fits the locked vision. The ordering matters — steps 0–1 are worth shipping even if Drive slips a release.

**Step 0 (do first, independent of Drive): make the data recoverable.**
File export/import (C2) + `navigator.storage.persist()` + kill the wipe path (C1). Until these exist, "sync" is a second copy of a foundation you can still lose.

**Step 1: give the DB an identity and a change journal.**
Add to the schema (a real migration, not a wipe):
```sql
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);   -- db_id (uuid), device_id (uuid per install), schema_version
CREATE TABLE change_log (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL, ts INTEGER NOT NULL,
  op TEXT NOT NULL,          -- INSERT | UPDATE | DELETE
  tbl TEXT NOT NULL, row_id TEXT NOT NULL,
  payload TEXT                -- JSON of changed columns only
);
```
Write a `change_log` row inside the **same transaction** as every mutation (M2 gives you the transaction). Track `last_pushed_seq` and `remote_etag` in `meta`. This one table is what turns an unmergeable blob into a mergeable one, and it is a few dozen lines.

**Step 2: OAuth, minimum scope, no persisted token.**
- Google Identity Services token client in the browser (public client, PKCE, **no** client secret). The client ID is public by design — it is not a secret — but lock it down with *Authorized JavaScript origins* in the Cloud console so it cannot be reused from another origin.
- Scope: **`https://www.googleapis.com/auth/drive.appdata` only.** Not `drive`, not `drive.file`. This is both the least privilege and the strongest sentence you can put in the README: *the app is technically incapable of reading anything else in your Drive.* Calendar: `calendar.app.created`. Photos (V3): append-only / app-created-data scopes — and re-check Google's 2025 Photos API scope restrictions before designing that feature.
- **Access token in memory only** (a module variable or a non-persisted zustand slice). Not localStorage, not IndexedDB, not a cookie. With no backend there is no HttpOnly option, so the only levers are minimizing lifetime and blast radius; an XSS reads localStorage and IndexedDB with equal ease. Prefer no refresh token at all — re-request silently with `prompt=none` on load, which is a no-click re-auth for an already-consented user.
- Ship a visible **"Disconnect Google"** that calls `google.accounts.oauth2.revoke`. With no backend you cannot revoke server-side, so the user needs the button.
- Do not let the token and the DB share a storage tier. If you ever cache a token, do not put it in the same IndexedDB the family data lives in.

**Step 3: uploads that cannot silently clobber or truncate.**
- Resolve the file by **`db_id` stored in the blob's `meta` and in the file's `appProperties`, never by filename.** Drive permits duplicate names in `appDataFolder`, so two devices syncing for the first time will each happily create "the" database and the tree forks permanently (register #16). On startup, `files.list` the `appDataFolder`, and if more than one `db_id` match exists, merge them rather than picking one.
- **Always** `uploadType=resumable`, never `uploadType=media`, for a multi-MB blob on Vietnamese mobile data. An abandoned resumable session leaves the previous file byte-for-byte intact — that is the atomicity you want. Persist the session URI so a dropped connection resumes instead of restarting. Verify the `size` (and your own `sha256`) in the completion response before marking synced.
- **Optimistic concurrency — do not overwrite, ever.** Record the remote `version` (monotonic) / `headRevisionId` you last based your local DB on. Before uploading, re-fetch metadata; if it moved, you are not the only writer → write an **immutable conflict copy** (`conflict-<device>-<ts>.sqlite`) and enter merge. Never `PATCH` over a head you did not observe.
  *Caveat, flagged honestly:* I could not confirm from the current Drive v3 documentation that `If-Match`/ETag preconditions are supported on `files.update` (the uploads guide does not mention preconditions at all — see Codex Cross-Review C6). A compare-then-write on `version` is a TOCTOU race, so **do not rely on the precondition existing**; make correctness depend on the never-overwrite + conflict-copy rule, and treat a working `If-Match` as a bonus optimization if you verify it experimentally.
- Store `sha256(blob)` + row counts in `appProperties`. After any download, verify the hash **and** `PRAGMA integrity_check` **before** replacing the local DB. A corrupt download must never destroy a good local copy.
- Keep your own rolling backups (last 5, e.g. `backup-<ts>.sqlite` in `appDataFolder`) in addition to Drive revisions — non-`keepForever` revisions get pruned. And note that `appDataFolder` is **not** a user-accessible backup: it is hidden, and revoking the app's access in Google account settings deletes it. The local file export from Step 0 remains the only recovery path the user actually controls, which is why it ships first.

**Step 4: merge without a CRDT.**
On `412`, download the remote blob into a *second* sql.js instance and replay: read the remote `change_log`, apply entries whose `(device_id, seq)` you have not seen to your local DB, then replay your unpushed entries on top, then push. Because every row has a UUID primary key and the journal is append-only, insert/insert never collides and delete is idempotent. The only true conflict is two devices updating **the same column of the same row**.

**Step 5: explicit conflict UI for the rare real conflict.**
Do not silently pick a winner. Show it in the user's own terms: *"Ông Nguyễn Văn Bình — Năm sinh: 1938 (điện thoại này) / 1937 (máy tính)"* with a choice, and log the resolution to `change_log` so both devices converge on the next sync. A genealogy app with silent last-write-wins will corrupt records that no living person can re-verify — the explicit prompt is the feature, not the overhead.

**Step 6: cost, quota, and growth.**
Debounce 10s, hard-cap one upload per 60s, and skip entirely when `MAX(change_log.seq)` has not moved. Once the blob passes ~5MB, switch to incremental: upload a small `journal-<device_id>-<seq>.jsonl` per session and compact into the base blob weekly. Designing `change_log` in Step 1 is what makes that a later optimization instead of a rewrite. Handle `403 rateLimitExceeded` / `429` with exponential backoff + jitter, and treat "user's Drive is full" as a first-class UI state — not a `console.error` (see H4).

**Step 7 (when the blob outgrows full-snapshot persistence): move the DB off the main thread.**
Not required for v1.0, but the current design has a ceiling. `db.export()` serializes the entire database **synchronously on the UI thread**, then structured-clones it into IndexedDB (M3), and sql.js holds the whole DB in memory by design. On a mid-range Android phone with a few thousand people and imported avatars, that is a visible freeze on every save. Two escalation options, both still 100% browser-side and compatible with the locked vision:
1. Move sql.js into a **Web Worker** and talk to it over Comlink/postMessage. Cheapest fix, keeps the full-snapshot model, unblocks the UI.
2. Migrate to the official `@sqlite.org/sqlite-wasm` build with **OPFS** persistence. This replaces full-blob rewrites with real incremental writes and durable, non-best-effort storage — which would retire C2b, H4b and most of M3 at once. It is a larger change and OPFS still requires cross-tab coordination (H2), so treat it as a deliberate v1.x migration, not a v0.7 side quest.

---

## PWA Gap Checklist

Current state: `public/` contains only `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` (Next boilerplate) and `sql-wasm.wasm`. `out/index.html` has **no** `rel="manifest"`. No `serviceWorker`/`manifest`/`themeColor`/`apple-mobile-web-app-*` reference anywhere in `src/` or `public/`. No `next-pwa`, `@serwist/next`, or `workbox` in `package.json`. `src/app/layout.tsx:7-11` sets only `title` and `description`. **The app is not installable and has no offline capability.**

- [ ] `public/manifest.webmanifest` — `name`, `short_name`, `start_url: "/"`, `scope`, `display: "standalone"`, `background_color`, `theme_color`, `lang: "vi"`, `orientation`
- [ ] Reference it from `src/app/layout.tsx` via `export const metadata = { manifest: "/manifest.webmanifest", themeColor: ..., appleWebApp: { capable: true, statusBarStyle: "default", title: "Gia Phả" } }`
- [ ] Icons: 192×192 and 512×512 PNG, **plus** a 512×512 `purpose: "maskable"` (Android adaptive icons crop non-maskable icons badly) — none of these exist today
- [ ] iOS: `apple-touch-icon` 180×180 (iOS ignores the manifest's icon array) + `apple-mobile-web-app-*` meta
- [ ] Splash: iOS needs explicit `apple-touch-startup-image` per device size, or accept a white flash
- [ ] Service worker — `@serwist/next` or `next-pwa`, configured for a static export. Must precache the app shell **and** `sql-wasm.wasm` (660KB; without precaching, every cold offline start fails)
- [ ] Cache strategy: app shell precache + `NetworkOnly` for `googleapis.com` (never cache Drive responses or token endpoints in the SW cache)
- [ ] Verify the SW does not break the static export's `_next/static` hashed filenames or the trailing-slash routing that `output: "export"` produces
- [ ] `navigator.storage.persist()` — the single highest-value PWA line in this app (C2); on iOS, installation to the Home Screen is what escapes the 7-day script-writable-storage eviction, so **install is a durability feature, not a convenience**
- [ ] Custom install prompt via `beforeinstallprompt` (Android/Chrome) + an iOS "Add to Home Screen" instruction sheet, since iOS never fires that event — and make the copy say *why* (protects your data), not just *how*
- [ ] Offline fallback UI: today `getDb()` failure renders a blank canvas (`src/db/client.ts:14` has no try/catch); needs a real error state
- [ ] Update flow: versioned precache + SW `skipWaiting` + a "new version available, reload" toast. Critical here for two reasons: a stale SW serving **old JS against a migrated DB** is a data-integrity hazard (C1), and serving **old JS against a newly cached WASM** (or vice versa) bricks startup (M4). Cache the JS and `sql-wasm.wasm` under one atomic cache version so the pair can never be mixed.
- [ ] `Cross-Origin-Opener-Policy: same-origin-allow-popups` at the host, required for the Google Identity Services popup
- [ ] Lighthouse PWA / installability audit in CI once the above lands

---

## Codex Cross-Review

Run: `codex exec --skip-git-repo-check` (codex-cli 0.149.0), self-contained prompt describing the browser-only / no-backend / sql.js + Drive architecture. The first attempt stalled at 27 min with no output and was killed; the second completed (~107k tokens) and independently read the actual source files. Its verdict: **"Release verdict: no-go"** — matching mine.

Reconciled below. Codex was right about four things I had missed or got wrong; I have folded those into the findings above (C2b, H4b, H7, and the Step-3 rewrite) rather than leaving them as commentary.

| # | Codex finding | Reconciliation | Evidence |
|---|---|---|---|
| C1 | **P0** — `Promise.all` on an unguarded async singleton constructs different DBs; last assignment/write wins. Multi-tab repeats it at larger scale. | **AGREE** — independently found. | `src/db/client.ts:10-11` guard vs `:27`/`:40` assignment; `src/components/FamilyTreeCanvas.tsx:136`. My H1/H2. |
| C2 | **P0** — *"Concurrent saves can commit older exported snapshots after newer ones because each opens its own connection."* | **AGREE — new, verified, and I had missed it.** Snapshot is taken at `:86`, the connection is opened at `:87`, so transaction ordering is decided by `openIDB()` resolution, not snapshot recency. With full-blob writes this is lossy. Added as **H4b**. | `src/db/client.ts:85-94`; triggered 3× per add by `src/components/QuickAddForm.tsx:76-129`. |
| C3 | **P0** — *"one failed IndexedDB read is followed by a successful empty write, replacing recoverable data"* | **AGREE with a correction.** The mechanism is real but not the one implied: a `req.onerror` on the `get` does **not** hit the `catch`, because `return new Promise(...)` (not `return await`) settles outside the `try`, so that path correctly rejects. The live hole is the `openIDB()` failure → `catch { return null }` → fall through to a fresh DB → `persistDb` `put`s an **empty** blob over the key. Added as **C2b**, with the precise distinction, since a fix that only addresses one path leaves the other open. | `src/db/client.ts:71-83` and `:20-42`. |
| C4 | **P0** — Single-blob LWW "is not synchronization"; a preflight `version` compare is TOCTOU; **Drive permits duplicate filenames so two first-sync devices each create "the" database.** | **AGREE.** The duplicate-filename fork was new to me and is a concrete first-run failure — added as register #16 and folded into Step 3 (resolve by `db_id` in `appProperties`, never by name). | Sync is unimplemented (`src/lib/drive.ts:11-13`), so this is design-level; contradicts `.plan/01-architecture.md:46-51`. |
| C5 | **P0** — *"No-backend forbids durable unattended OAuth"* → automatic sync while the app is closed is **not deliverable**; foreground-only. | **AGREE — new, and the most valuable item Codex contributed.** A browser-only public client cannot hold a refresh token (Google "Web application" clients require a secret at the token endpoint), and a Service Worker would have no valid token. This invalidates the documented design at `.plan/plan.md:127` and `.plan/01-architecture.md:51`. Added as **H7**. Its corollary — Calendar reminders still work because Google delivers them once the event exists — is also correct and worth keeping in the roadmap. | `.plan/plan.md:127`, `.plan/01-architecture.md:51`. |
| C6 | Correction aimed at my prompt: *"static export cannot use Next's `headers()`, but CSP remains possible through the static host or a meta policy."* | **AGREE — already my position** (H6 recommends exactly the host-header/meta route). Separately, Codex's caution led me to re-check my own `If-Match` recommendation: the Drive v3 uploads guide documents **no** precondition support, so I have downgraded that to UNVERIFIED and re-based Step 3 on never-overwrite + immutable conflict copies, which does not depend on a precondition existing. Correcting my own report here. | `next.config.ts:1-5`; Drive uploads guide fetched — no `If-Match`/ETag/precondition content. |
| C7 | **P1** — XSS becomes Drive/Calendar account compromise; *"a live browser token is readable by any same-origin script regardless of whether stored in memory, IndexedDB, or localStorage."* | **AGREE on the risk; PARTIALLY DISAGREE on the equivalence.** True that an XSS executing *while* a token is live can read it from a closure as easily as from storage. But the exposure windows are not equal: a memory-only token dies on reload, while a localStorage/IndexedDB token is readable by *any* XSS at *any* later time, including one injected long after the sync. Minimizing lifetime is the only lever available without a backend, so memory-only remains the right call — it just must not be sold as a complete mitigation. Unchanged in H5/Step 2. | `src/components/SidePanel.tsx:148-155`. |
| C8 | **P1** — `window.__giapha.seed()` is a one-call destructive primitive in production. | **AGREE** — independently found, same severity reasoning. | `src/app/page.tsx:19-21` → `src/db/persons.ts:160-163`, committed by `saveDb()` at `:257`. My C3. |
| C9 | **P1** — Drive upload cost/state: resumable, retain session URI, verify returned size/checksum, mark synced only on success, backoff on quota, pin a bounded set of revisions because Drive purges old ones. | **AGREE** — matches my Step 3/6; I have added "persist the session URI" and "verify `size` from the completion response", which I had not spelled out. | Design-level. |
| C10 | **P1** — Not reliably installable or offline-ready; *"HTTP cache is not an offline contract"*; needs versioned precache incl. WASM and an *"update UX that never mixes old JS with new WASM."* | **AGREE.** The old-JS/new-WASM framing is sharper than my "update flow" bullet and is a genuine integrity hazard given C1's wipe-on-schema-mismatch. Folded into the PWA checklist. | `public/` has no manifest/icons/SW; `out/index.html` has no `rel="manifest"`; no PWA dep in `package.json`. |
| C11 | **P2** — *"Every mutation synchronously exports the whole DB on the UI thread"*; recommends a worker-owned DB, coalesced checkpoints, and notes OPFS helps persistence but not multi-tab. | **AGREE — extends my M3.** I had the debounce; the worker and the `@sqlite.org/sqlite-wasm` + OPFS escalation are better long-term answers and stay within the no-backend constraint. Added as Step 7, explicitly scoped as v1.x so it does not become scope creep now. | `src/db/client.ts:86` (`db.export()` on the main thread). |
| C12 | **P2** — Supply chain: `^1.14.0` allows sql.js minor upgrades against a hand-copied WASM with no build assertion; absolute `/sql-wasm.wasm` breaks subpath hosting; keep one IDB connection with `onversionchange`, add `onblocked`. | **AGREE** — independently found (my M4, M5, H3). Codex recommends adding `onblocked` but does not note the consequence I found: with no `onblocked` handler the promise **never settles**, so `getDb()` hangs forever with no error rather than failing. Keeping my sharper framing. | `package.json:24`, `src/db/client.ts:15`, `:58-69`. |
| C13 | *"Not script XSS: `<img src>` does not normally execute `javascript:`/SVG script in modern browsers"* — still a real privacy leak (remote host learns IP + viewing timing). | **AGREE — and this matches how I already classified it.** Worth recording explicitly as a **non-issue for XSS** so nobody "fixes" the avatar `<img>` as a script-execution bug: it is a privacy/offline defect (M6), not a code-execution one. | `src/components/PersonCard.tsx:137-143`. |
| C14 | *"Theoretical today: doubling every single quote is adequate for values… the real injection surface is the unvalidated column identifier."* | **AGREE — identical conclusion, independently reached.** Two reviewers converging that the value-escaping is *not* exploitable is worth recording, so this does not get re-litigated as a finding in a later audit. The column identifier is the real defect (M1). | `src/db/persons.ts:36-41` (values, safe) vs `:102-104` (column name, unsafe). |
| C15 | *"Theoretical: an interrupted resumable Drive upload should not partially corrupt the committed head. Competing complete uploads and mishandled retry state are the real risks."* | **AGREE — this corrects my register row #13.** A dead resumable session leaves the old file intact, so "truncated blob" was overstated. I have reworded #13 around verification-before-marking-synced, and the real risk (competing *complete* uploads) is register #12 / Step 3. | Design-level. |
| C16 | Safari's 7-day rule applies to script-writable storage after 7 days without site interaction; installed Home Screen apps are *intended* to be exempt — and this app cannot obtain that protection because it is not PWA-ready. | **AGREE** — same conclusion as register #3. Reinforces that "installable" is a durability requirement here, not a nice-to-have. | No manifest/SW; `navigator.storage.persist()` never called. |
| C17 | *"`appDataFolder` is hidden and app-scoped, but users can delete it or remove the app; it is not an export/recovery facility."* | **AGREE — new nuance, added as register #17.** Strengthens the C2 argument: the local file export stays mandatory even after Drive sync ships, because revoking app access deletes the app-data folder. | Design-level. |
| C18 | CCCD: local OCR only, never retain the raw card image by default, explicitly confirm extracted fields, do not upload plaintext CCCD unless the blob is client-side encrypted. | **AGREE** — consistent with L5; "explicitly confirm extracted fields" and "do not retain the image" are additions worth keeping (they also reduce OCR-error liability, not just privacy risk). | `README.md:16`, `.plan/01-architecture.md:56`. |

**Codex missed** (kept from my pass, so nothing is lost by the merge): `openIDB` without `onblocked` causing a **permanently unsettled promise / silent app hang** (H3); `escapeSql` emitting literal `NaN` from a cleared number input (M1); the localStorage-vs-IndexedDB split-brain that hides data loss behind a friendly empty state (L6); `test-exec.js` being **tracked** in git and `.claude/` being neither tracked nor ignored while a nested worktree doubles every lint run (M8); `pnpm lint` failing 12 errors while `pnpm build` passes, so a build-only CI is green (M9); the broken `"start": "next start"` script under `output: "export"` (L1); missing `images.unoptimized` (L2); and the `.gitattributes` `* text=auto` question (L4, concluded a non-issue).

**Net effect of the cross-review:** 3 new verified defects (C2b, H4b, H7), 1 new design-level fork risk (duplicate Drive filenames), 2 corrections to my own report (`If-Match` downgraded to unverified; register #13 overstated), and independent convergence on the two calibration calls that matter most — that value-side SQL escaping is *not* exploitable, and that the avatar `<img>` is a privacy leak rather than an XSS.

---

## Unresolved Questions

1. **Deploy target?** Determines whether CSP + COOP headers are settable (H6) and whether a `basePath` will break the absolute `/sql-wasm.wasm` load (M5). Static export alone does not answer this.
2. **Is multi-device concurrent editing in scope for v1.0, or is v1.0 explicitly single-device with Drive-as-backup?** The answer changes the whole sync design. `.plan/01-architecture.md:46-51` currently specifies naive `Modified Date` last-write-wins, which will lose data; the change-journal approach only pays for itself if concurrent editing is real.
3. **Will one Drive blob ever be shared across family members** (the V3 social direction, `README.md:19`)? If yes, multi-writer merge and per-person authorization become mandatory and the single-blob-in-`appDataFolder` model has to change — `appDataFolder` is per-user and per-app and cannot be shared at all.
4. **Is "no refresh token, silent re-auth on each load" an acceptable tradeoff** for eliminating persistent-token XSS exposure? This is a product decision, not a security one.
5. **Who is the data controller under PDPD** when user A stores relative B's CCCD, phone and address, and B never consented? With no backend there is no central deletion mechanism. This needs an answer before CCCD scanning ships (L5).
6. **Is `.plan/` intended as the durable plan location**, or should new plans go to `plans/` (the configured reports path)? Both exist; `.plan/plan.md` is the live one. Not my call to change — flagging for the lead.
7. **What is the intended lint gate?** `pnpm lint` has been failing (M9) while `pnpm build` passes. Is lint expected to be green, or is it advisory?
