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

## Change process

Create a new ADR when a decision changes. Mark the old row `Superseded` and link both records; do not rewrite history to hide the original rationale.
