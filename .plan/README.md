# AI Knowledge Base

Day la entrypoint bat buoc cho moi AI/maintainer lam viec voi du an.

## Current state

- Repository `gia-pha` la repository phat trien dang hoat dong cua san pham **Gia Phả**.
- Code hien tai van la baseline prototype va chua dat production quality: xem `reviews/2026-07-11-legacy-review.md`.
- Tai lieu `TARGET` mo ta cac phan se duoc thay the/trien khai trong chinh `gia-pha`; khong tao repository greenfield va khong doi ten repository.
- ADR-010 thay the quyet dinh greenfield trong ADR-001. Doc trang thai task truoc khi suy dien tien do.

## Reading order

1. `overview.md`: product intent, audience, boundaries.
2. `decisions/README.md`: accepted decisions and rationale.
3. `01-architecture.md`: target technical architecture.
4. `02-database-schema.md`: target domain/data model.
5. `data-formats.md`: native JSON and GEDCOM contracts.
6. `03-ux-workflow.md` and `flow.md`: user and data flows.
7. `plan.md` and `task.md`: roadmap and executable backlog.
8. `changelog.md`: documentation/project history with reasons.

## Documentation rules

- Distinguish `CURRENT`, `TARGET`, and `FUTURE`; never describe planned work as implemented.
- Update an ADR when a durable technical/product decision changes.
- Every completed task must update `task.md` and append a changelog entry containing What, Why, Impact, and References.
- Do not silently delete historical decisions. Supersede them and link the replacement.
- Product prose may be Vietnamese; API names, schemas, and code identifiers remain English.
