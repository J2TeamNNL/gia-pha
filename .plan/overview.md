# Gia Phả - Product Overview

Status: `TARGET`; this document describes the product being implemented in `gia-pha`, not the current prototype runtime.

## Vision

Gia Phả is an open-source, privacy-first family tree application for Vietnamese families. Non-technical users can use a public website, while technical users can clone and self-host the same application.

The hosted website distributes static application assets only. Family data is created, queried, imported, converted, and exported inside the browser. There is no account requirement and no server-side family database.

## Primary audience

- A tree owner manages one or more independent family trees.
- Relatives primarily view exported data or exchange files directly.
- Vietnamese genealogy and terminology are the product default; English UI is secondary.
- Modern mobile and desktop browsers are supported.

## Core MVP success criteria

- Manage multiple persistent local trees.
- Create, edit, delete, search, and navigate people and family relationships.
- Represent multiple unions, divorce, biological/adoptive parentage, unknown parents, and half-siblings.
- Import/export versioned native JSON and GEDCOM without silent data loss.
- Render a focused family graph responsively; benchmark 10,000 people and at most 500 visible nodes.
- Send no family data or telemetry automatically.

## Product boundaries

### Core MVP

- Local workspace, family graph, CRUD, search, native JSON, GEDCOM, diagnostics, tests.

### Future (confirmed roadmap, 2026-07-12)

The founder's original feature list is the official post-MVP roadmap:

- Google Drive backup/sync (data lives in the user's own Drive).
- PWA installation/offline asset cache.
- Vietnamese kinship terms computed from the reference person (danh xưng).
- Lunar calendar with Can Chi, birthday/death-anniversary (ngày giỗ) reminders, Google Calendar sync.
- Child-name suggestions that avoid ancestor name clashes.
- Tử vi / lịch kỵ date warnings (advisory only, no superstition push).
- CCCD/ID-card scanning (OCR) for fast data entry.
- Export the tree diagram as an image.
- Google Photos embedding per person (open question: embedded media vs. Native JSON export portability).
- Google Maps directions to member addresses.
- GEDCOM import/export and additional adapters.
- Manual source linking, reviewed delta updates, merge suggestions with human approval and rollback.

### Explicitly not planned for core

- Central family-data server, mandatory login, realtime collaboration, automatic merge, community discovery, analytics, or session replay.

## Naming and licensing

- Product and repository identifier: `gia-pha`; display name: **Gia Phả**.
- Active repository: `J2TeamNNL/gia-pha` (public); development continues in place.
- License target: AGPL-3.0.
