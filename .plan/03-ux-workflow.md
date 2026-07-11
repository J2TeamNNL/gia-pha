# Target UX Workflows

## Workspace first

The first screen is the usable local workspace, not a marketing landing page. It shows local trees and clear actions to create or import. Empty, loading, unsupported-browser, storage-denied, and recovery states are first-class.

## Tree editor

- Canvas occupies the primary surface; details/editing use a side panel on desktop and full-height sheet on mobile.
- Search and reference-person controls remain reachable without covering the graph.
- Pan, zoom, fit selection, focus branch, generation depth, and collapse controls have stable dimensions and keyboard equivalents.
- The graph renders only a focused subset and explains when nodes are hidden by the 500-node view guard.

## Data entry

- Quick add captures name, relationship context, and minimum required facts.
- Full edit organizes identity, dates, life status, contact, biography, sources, and privacy classification.
- Relationship creation is explicit about partner/union and biological/adoptive parentage; no directional plus button may silently invent an unsupported relationship.
- Validation happens before commit and errors preserve form input.

## Import/export

- Import always shows format, counts, warnings, and loss/extension handling before commit.
- Native import creates a new tree by default to prevent accidental overwrite.
- Export begins with scope/privacy selection, then format choice, then plaintext warning.

## Diagnostics and trust

- Footer/about exposes AGPL license, GitHub source, build version, and commit SHA.
- Error dialog previews sanitized diagnostics and offers explicit copy/download/GitHub/contact actions.
- No analytics consent banner is needed because there is no analytics.

## Accessibility and localization

- Vietnamese is the default product language; English remains supported through complete dictionaries rather than scattered conditionals.
- All icon-only controls have labels/tooltips; focus order, contrast, reduced motion, screen reader names, and touch targets are tested.
