# Legacy `gia-pha` Review - 2026-07-11

## Summary

The repository is a useful UI/data experiment, not a safe base for production data. The working tree was clean during review. `npm run lint` failed with five errors. Production build was not verified because `next/font` attempted to fetch Google Fonts in a network-restricted environment. There is no real automated test suite.

## Critical

### Automatic schema reset can destroy local data

`src/db/client.ts:23-36` clears IndexedDB whenever a small column-presence check fails. There is no migration, backup, recovery export, or confirmation. Any schema evolution can erase a user's only family database.

## High

### Canvas does not use relationship data

`src/components/FamilyTreeCanvas.tsx:25-26` separates only anchor versus non-anchor people, and lines `145-209` render every other person as one flat branch. Stored parent/spouse relationships do not determine layout, so the displayed genealogy is incorrect after basic use.

### Person and relationship creation is not atomic

`src/components/QuickAddForm.tsx:74-128` persists the person before creating relationships in separate saves. A relationship error leaves an orphan person and inconsistent UI/database state.

### Sibling action creates an unlinked person

`src/components/QuickAddForm.tsx:117-123` warns that sibling relationships are unsupported but still completes person creation. The UI presents the action as successful.

### Relationship model is ambiguous

Spouses are stored as two `SPOUSE` rows while parenthood is directional. There are no uniqueness/check constraints, union/family grouping, or explicit child-to-couple association. Multiple partners and children cannot be laid out reliably.

## Medium

- `src/db/schema.ts` validates only a few columns and has no migration/version table.
- Foreign-key enforcement is not explicitly enabled; schema lacks relationship integrity constraints.
- `src/db/persons.ts` constructs SQL manually for inserts/updates, uses broad casts, and logs debug data in normal flows.
- Zustand persists an `anchorPersonId` separately from SQLite `is_anchor`, allowing two sources of truth to drift.
- `QuickAddForm` contains hard-coded Vietnamese while the surrounding app claims VI/EN support; “full form” is not a distinct complete editor.
- Google sign-in is a visual button only and `src/lib/drive.ts` is a mock.
- PWA behavior claimed by README/plans has no manifest/service worker implementation.
- Remote Google Font usage conflicts with offline/privacy goals and caused the reviewed build failure.

## Quality and documentation gaps

- Lint: four `no-explicit-any` failures in `src/db/persons.ts` and one CommonJS import failure in `test-exec.js`.
- `test-exec.js` is a manual sql.js smoke script, not an assertion-based test.
- No tests cover persistence, migrations, CRUD, graph correctness, import/export, accessibility, or privacy.
- `package.json` says `0.1.0` while `.plan/plan.md` claimed releases through `0.3.0`.
- Existing plans described Drive sync, PWA, offline background sync, full relationships, and advanced forms as if decided or completed despite missing implementation.

## Reusable ideas

- Next/React/TypeScript prototype demonstrates viable browser-side WASM loading.
- Canvas plus side-panel workflow and quick/full progressive entry are useful product concepts.
- Vietnamese-first fields, partial dates, reference-person concept, and surname suggestions should inform the greenfield UX.
- Existing open-source analyses remain useful background, but their recommendations require fresh validation before adoption.

