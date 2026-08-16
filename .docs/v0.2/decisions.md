<!-- snapshot: v0.2 | current | updated: 2026-08-16 -->

# Architecture Decision Log

| ID | Status | Decision | Reason |
|---|---|---|---|
| ADR-001 | Superseded by ADR-010 | Build `coi-nguon` as a greenfield public repo; retain `gia-pha` as reference. | Historical decision; replaced when implementation scope changed. |
| ADR-002 | Accepted | Hosted static app is local-only with zero telemetry and no account/backend. | Enables non-technical users without centralizing sensitive family data and preserves self-host parity. |
| ADR-003 | Accepted | Use SQLite WASM/OPFS as runtime storage; use JSON/GEDCOM only at boundaries. | Transactions, indexes, validation, and large-tree queries are safer than mutating a monolithic JSON document. |
| ADR-004 | Accepted | Model unions and child membership instead of symmetric spouse edges. | Correctly groups children with partners and supports multiple marriages, adoption, and unknown parents. |
| ADR-005 | Accepted | Use React Flow plus ELK worker with focused rendering. | Genealogy is not a single-root tree; the combination supports graph viewport interaction, ports, and complex layered layout. |
| ADR-006 | Accepted | All exports are plaintext with warnings and privacy filters. | Maximizes interoperability; users explicitly accepted file-level privacy responsibility. Encryption may be optional later, not required by v1. |
| ADR-007 | Accepted | GEDCOM adapters preserve unknown extensions and report loss. | Interoperability must never silently discard data from other platforms. |
| ADR-008 | Accepted | Merge/community linking is future work; core only preserves stable IDs/provenance. | Avoids CRDT, identity, trust, and conflict complexity before local core is reliable. |
| ADR-009 | Accepted | License `gia-pha` under AGPL-3.0. | Public/self-hosted modifications should remain available under the same open-source obligations. |
| ADR-010 | Accepted | Continue development in the existing public `gia-pha` repository; replace incompatible prototype modules in place. | The approved scope keeps repository continuity while the target architecture governs all replacement work; no greenfield or repository rename is created. |
| ADR-011 | Accepted | Resolve xưng hô as a pure function of (ego, target) via a kinship path signature, then render through a per-branch dialect dictionary. | Address terms are pairwise and register-dependent, so they cannot be stored on a person. Separating traversal from rendering keeps a new region or language a data table rather than a code change. |
| ADR-012 | Accepted | Define a branch as a root person's descendants plus married-in partners, with manual per-person assignment as a supported peer of derived membership. | Genealogy assembled from acquaintance always contains people who must be addressed correctly but share no common ancestor; a purely derived rule would silently exclude them. |
| ADR-013 | Accepted | Never infer seniority when birth order and birth dates are both absent; surface `chưa rõ` instead. | `bác` versus `chú` is a social error rather than a display defect, and a visible gap prompts the correction that a plausible guess would suppress. |
| ADR-014 | Superseded by ADR-015 | GEDCOM (`IO-002`) is Future, not MVP; Native JSON v1 (`IO-001`) alone carries data portability for the core release. | Reasoning held only while the app was single-user. Superseded the same day when public release entered scope. |
| ADR-015 | Accepted | GEDCOM returns to MVP scope, and its `INDI`/`FAM` model is the reference the domain model is designed against from the start. | Public release means strangers arrive holding trees exported from Ancestry, MyHeritage, and FamilySearch; without GEDCOM import they cannot get in the door, and real third-party files are also the fastest source of the malformed data needed to debug the importer. Designing against the standard now avoids a retrofit later. |
| ADR-016 | Accepted | `selfRef` in an address dictionary may be a plain string or a gender-keyed record resolved against ego's own gender, and `resolveAddress` therefore takes ego's gender. | A younger sibling calls their elder `anh` but refers to themselves as `em`, while an elder sibling's self-reference is `anh` or `chị` depending on their own gender. A pair keyed only by kinship signature cannot express that, so the type carries it rather than the caller guessing. |
| ADR-017 | Accepted | Unknown ego gender returns an `UNKNOWN_GENDER` status, parallel to `UNKNOWN_SENIORITY`. | Same doctrine as ADR-013: an address term the data cannot support is surfaced as unresolved, never rendered as a plausible default. |

## Change process

Create a new ADR when a decision changes. Mark the old row `Superseded` and link both records; do not rewrite history to hide the original rationale.
