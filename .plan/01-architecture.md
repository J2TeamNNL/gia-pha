# Target Architecture

Status: `TARGET`; none of this document should be interpreted as implemented in `gia-pha`.

## Principles

- Local-only by default: no account, server database, telemetry, or automatic error upload.
- Static hosted app and self-hosted app use the same artifact and behavior.
- SQLite is the runtime source of truth; JSON/GEDCOM are exchange formats.
- Domain logic does not import UI, browser storage, or format-specific code.
- Planned cloud/community features attach through ports without changing core ownership of data.

## Stack

- Vite + React + TypeScript + Tailwind.
- React Router for workspace/editor/settings routes.
- TanStack Query for async repository cache; a small UI store only for selection, viewport, and panels.
- `@sqlite.org/sqlite-wasm` in a dedicated Worker with OPFS persistence.
- React Flow for interaction/viewport and ELK in a Worker for layered layout with union nodes and ports.
- Zod/JSON Schema at I/O boundaries; React Hook Form for forms.
- Vitest and Playwright for unit/integration/browser coverage.

## Layers

1. `domain`: entities, invariants, relationship validation, use cases.
2. `application`: commands/queries and ports such as repositories, import/export, layout, diagnostics.
3. `infrastructure`: SQLite/OPFS, GEDCOM/JSON adapters, browser file APIs, workers.
4. `presentation`: routes, forms, graph nodes, panels, translations.

## Storage topology

- One catalog database stores local tree metadata and last-opened state.
- Each tree has an independent SQLite file to simplify isolation and export.
- One writer per tree is coordinated through Web Locks; other tabs receive change notifications through BroadcastChannel.
- Schema changes use numbered migrations. A failed migration preserves the original file and offers export/recovery; it never wipes automatically.
- App requests persistent storage and displays quota/backup status without promising that browser storage is permanent.

## Network policy

- Bundle fonts/icons/WASM/workers locally; no runtime CDN.
- Production CSP restricts network and script sources.
- Any future connector is explicit, scoped, disabled by default, and must never receive unrelated tree fields.
- Build UI exposes source repository and exact commit SHA.

## Deployment constraint

SQLite Worker/OPFS requires HTTPS and appropriate isolation headers. VPS `j2` must be audited before selecting Nginx/Caddy/container deployment. Audit is read-only and deployment is a separate decision.
