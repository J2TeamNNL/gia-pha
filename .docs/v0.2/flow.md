<!-- snapshot: v0.2 | current | updated: 2026-08-16 -->

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

---

# Product and Data Flows

## Create and reopen a tree

1. User opens the hosted or self-hosted static app.
2. App feature-detects Worker, WASM, OPFS, Web Locks, and persistent storage.
3. User creates tree metadata and optionally adds any first person.
4. User may choose a reference person later; it is not required to be the app user.
5. Every mutation runs in a SQLite transaction and persists locally.

## Native import

1. User selects a local JSON file; the browser does not upload it.
2. Worker validates size, format version, schema, IDs, and referential integrity.
3. App shows counts, warnings, unsupported data, and destination choice.
4. User confirms; import commits atomically into a new tree by default.

## GEDCOM import/export

1. Adapter detects GEDCOM version and encoding.
2. Parser maps supported records into the canonical domain and preserves unknown extensions.
3. Preview reports assumptions, conflicts, and fields that cannot be represented.
4. Export selects GEDCOM 7 or compatibility 5.5.1 and emits a loss report when needed.

## Plaintext export

1. User chooses full tree or branch and selects privacy fields.
2. App warns that the resulting file is readable by anyone who receives it.
3. Export is generated locally and downloaded directly.

## Error reporting

1. Error boundary captures an error locally.
2. Diagnostic builder removes family values and includes app SHA, browser, operation, sanitized stack, and aggregate counts only.
3. User previews and explicitly chooses copy/download, GitHub Issue, or maintainer contact.
4. Nothing is sent automatically.

## Future linked-source update

Bundles will carry stable source/tree/record IDs. A later workflow may compare a new source snapshot, suggest matches, show field-level diffs, require approval, and store a rollbackable change set. No automatic synchronization is implied.


---

## Tree lifecycle

```mermaid
flowchart TD
    A[Open static app] --> B{Worker + WASM + OPFS<br/>+ Web Locks available?}
    B -- no --> C[Explicit capability failure<br/>never silent transient storage]
    B -- yes --> D[Catalog DB<br/>tree metadata]
    D --> E[Create or open a tree]
    E --> F[(Isolated SQLite file<br/>one per tree)]
    F --> G[CRUD in transactions]
    G --> H{Export}
    H -- Native JSON --> I[Validate, deterministic output]
    H -- GEDCOM --> J[Map + preserve unknown tags<br/>emit loss report]
    I --> K[Plaintext warning<br/>local download]
    J --> K
```

## Xưng hô resolution

```mermaid
flowchart TD
    EGO[ego = anchorPersonId] --> BFS
    TGT[target person] --> BFS
    BFS["1 - Path signature<br/>BFS over parent / child / partner<br/>shortest path, MAX_PATH_DEPTH"]
    BFS -- beyond cap --> DIST[DISTANT<br/>generation-based fallback]
    BFS --> SEN

    SEN{"2 - Seniority"}
    SEN -- birth_order --> OK[elder / younger]
    SEN -- birth dates --> OK
    SEN -- neither --> UNK["UNKNOWN<br/>renders 'bác/chú (chưa rõ)'<br/>never guessed"]

    OK --> BR
    UNK --> BR
    BR["3 - Branch membership<br/>root descendants + married-in<br/>+ manual assignment"]
    BR -- one branch --> REN
    BR -- several --> MULTI[render every branch label<br/>side by side]

    REN["4 - Render<br/>signature + seniority<br/>-> branch profile dictionary"]
    MULTI --> REN
    REN --> PAIR["gọi / xưng pair<br/>spoken | formal | reference"]

    PAIR --> OUT1[Graph + side panel]
    PAIR --> OUT2[Relative list, exportable]
    PAIR --> OUT3[Invitation phrasing]
```

## Branch profiles

```mermaid
flowchart LR
    subgraph Paternal["Nội — TRUNG / Quảng Trị"]
        GF[Ông nội] --> FA[Bố]
    end
    subgraph Maternal["Ngoại — BAC / Hà Nội"]
        GM[Ông ngoại] --> MO[Mẹ]
    end
    subgraph Spouse["Nhà vợ — NAM"]
        FIL[Bố vợ] --> WI[Vợ]
    end

    FA --> EGO((ego))
    MO --> EGO
    WI --- EGO
    EGO --> CH[Con]
    WI --> CH

    CH -.->|belongs to both,<br/>shows two labels| Paternal
    CH -.-> Spouse
```

Ego addresses the spouse's branch in the spouse's register — "gọi thay ngôi". The signature
is recomputed with the spouse as ego and rendered in that branch's profile, so ego calls the
wife's maternal uncle `cậu` despite having no blood path that would produce it.

---

## Delivery state

```mermaid
flowchart LR
    subgraph Done["Landed — 69 tests green"]
        K["src/kinship/<br/>XH-001..003<br/>resolvePath, compareSeniority,<br/>resolveAddress, dictionaries"]
        B["src/db/branches.ts<br/>XH-004 — migration v4<br/>profiles, roots, membership"]
        G["src/io/gedcom/<br/>IO-002 import<br/>tokenizer, mapping, loss report"]
    end

    subgraph Next["Not built"]
        A["Phase A — join<br/>branch profile -> resolveAddress"]
        UI["Phase B — XH-005<br/>graph + side panel labels"]
        L["Phase C — XH-006<br/>relative list + invitation"]
        S["Phase D — branch setup UI"]
        E["Phase E — GEDCOM export<br/>+ wire import to DB"]
    end

    K --> A
    B --> A
    A --> UI
    A --> L
    B --> S
    G --> E

    style Done fill:#e8f5e9,stroke:#2e7d32
    style Next fill:#fff3e0,stroke:#ef6c00
```

Phase A is the single blocker: the engine resolves a term for a pair and the branch layer
knows which dialect applies, but nothing connects them. Phases B and C both wait on it and
can then run in parallel.
