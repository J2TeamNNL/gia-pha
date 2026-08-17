<!-- snapshot: v0.2 | current | updated: 2026-08-17 -->

# Target UX Workflows

## Workspace first

The first screen is the usable local workspace, not a marketing landing page. It shows local trees and clear actions to create or import. Empty, loading, unsupported-browser, storage-denied, and recovery states are first-class.

## Tree editor

- Canvas occupies the primary surface; details/editing use a side panel on desktop and full-height sheet on mobile.
- Search and reference-person controls remain reachable without covering the graph.
- Pan, zoom, fit selection, focus branch, generation depth, and collapse controls have stable dimensions and keyboard equivalents.
- The graph renders only a focused subset and explains when nodes are hidden by the 500-node view guard.

## Data entry

Two paths, both committing through one transactional write (`DB-001`).

- **Quick add** captures full name, birth year, death year, life status, gender, and the
  relationship to the person in focus. The name is typed as one field and split
  surname-first, with a manual override for names the rule gets wrong. Saving keeps the
  surname, gender, and relationship so a run of siblings needs only the given name typed.
- **Paste a list** takes a spreadsheet copy, maps its header, and shows a per-row preview
  with errors and warnings before anything is written.
- Birth year is a first-class field on both paths because seniority — and therefore
  `bác` versus `chú` — cannot be resolved without it.
- Relationship creation is explicit about partner and biological/adoptive parentage; a
  directional plus button never silently invents an unsupported relationship. Siblings are
  stored through shared parents, and the form refuses when no parent is known.
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

## Data entry paths

```mermaid
flowchart TD
    subgraph Paste["Dán danh sách — ENT-001"]
        P1[Copy rows from Excel or Sheets] --> P2["parseTable<br/>tab-separated or quoted CSV"]
        P2 --> P3["mapColumns<br/>header matched without diacritics"]
        P3 --> P4["planPaste<br/>resolve Cha / Mẹ / Vợ-Chồng by name"]
        P4 --> P5{Name matches<br/>exactly one person?}
        P5 -- no match --> PE["ERROR on that row"]
        P5 -- several --> PA["ERROR: add the birth year<br/>in brackets, never guess"]
        P5 -- one --> P6[Preview table<br/>per-row status]
    end

    subgraph Form["Thêm từng người — ENT-002 / ENT-004"]
        F1[Pick a person on the graph] --> F2["Directional + button<br/>sets the relationship"]
        F2 --> F3["One Họ tên field<br/>split surname-first"]
        F3 --> F4["Năm sinh, năm mất,<br/>đã mất, giới tính"]
        F4 --> F5["linksForRelation<br/>sibling links via shared parents"]
    end

    P6 --> BULK
    F5 --> BULK
    BULK["bulkImport — DB-001<br/>mint ids, resolve externalId,<br/>validate every relationship"]
    BULK --> TX{"All rows valid?"}
    TX -- no --> ROLL["Reject the batch,<br/>name the offending row"]
    TX -- yes --> COMMIT[("batch worker command<br/>BEGIN IMMEDIATE / COMMIT")]
    COMMIT --> STORE[Store: persons + relationships]
    STORE --> TERMS["Address terms recomputed<br/>and shown on the cards"]
```

Saving keeps the surname, gender, and relationship in the form, so entering a run of
children costs one given name and `Ctrl`+`Enter` each. A row the importer cannot resolve is
excluded from the commit and the button states how many it is skipping — a partial import is
always a stated choice.

## Delivery state

```mermaid
flowchart LR
    subgraph Done["Landed and green — 125 unit tests, 7 browser specs"]
        K["src/kinship/<br/>XH-001..003 engine<br/>+ XH-007 branch join"]
        B["src/db/<br/>XH-004 membership<br/>+ DB-001 bulk writes"]
        ENT["Entry<br/>ENT-001 paste, ENT-002 form,<br/>ENT-003 colours, ENT-004 fixes"]
        UI["XH-005 terms on the tree<br/>XH-006 relative list<br/>XH-008 branch setup"]
    end

    subgraph Deferred["Deferred to P2"]
        G["IO-002 GEDCOM<br/>import landed, export not started"]
        J["IO-001 Native JSON v1"]
    end

    subgraph Open["Still P0 / P1"]
        PR["PRIV-001 network proof"]
        PF["PERF-001 10k people"]
        RL["REL-001 version + build SHA"]
    end

    K --> UI
    B --> UI
    B --> ENT
    ENT --> UI

    style Done fill:#e8f5e9,stroke:#2e7d32
    style Deferred fill:#eceff1,stroke:#607d8b
    style Open fill:#fff3e0,stroke:#ef6c00
```

The founder's two dated outcomes are served: a relative list with a gọi/xưng pair per
person for wedding invitations, and address terms visible on the tree while entering it.
What remains is release hygiene rather than feature work — a test proving no family data
reaches the network, a 10,000-person benchmark, and a visible build SHA.
