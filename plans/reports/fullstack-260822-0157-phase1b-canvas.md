# Phase 1B — canvas vẽ đúng (hình học layout)

Scope: chỉ hình học layout. KHÔNG pan/zoom/keyboard, KHÔNG a11y (wave sau).

## Files

- `src/lib/tree-layout.ts` — MỚI, hàm thuần `computeTreeLayout(persons, relationships, anchorId?, config?)`.
- `src/components/FamilyTreeCanvas.tsx` — dùng `computeTreeLayout`, bắt lỗi load riêng khỏi "cây rỗng", gộp connector 1 `<path>`/loại.
- `src/components/PersonCard.tsx` — card kích thước cố định (`w-36 h-[124px]`), tên `truncate` 1 dòng, header vai-vế luôn chiếm chỗ cố định (có/không nhãn không đổi tổng chiều cao).
- `src/components/QuickAddForm.tsx` — "Thêm Anh/Chị/Em": chặn sớm nếu người được chọn chưa có cha/mẹ ghi nhận; nếu có, nối người mới với ĐÚNG bộ cha/mẹ đó. Dùng `t.form.errors.*` (dictionary đã có sẵn 2 key, chưa ai dùng).
- `src/i18n/vi.ts`, `src/i18n/en.ts` — thêm `form.errors.siblingNeedsParent`, `canvas.loadErrorTitle`, `canvas.reload`.

Không sửa `src/db/**`, `src/app/page.tsx`, `package.json`, `tests/**`, `docs/**`.

## Chữ ký hàm layout (để test dùng)

```ts
function computeTreeLayout(
  persons: LayoutPerson[],       // { id, birth_year? } — Person thật thoả mãn tự nhiên
  relationships: LayoutRelationship[], // { person_id, related_to_id, rel_type, is_primary? }
  anchorId?: string | null,      // chỉ dùng để ưu tiên thứ tự component chứa anchor
  config?: Partial<LayoutConfig>, // { colWidth, rowHeight, cardHeight }
): { nodes: LayoutNode[]; connectors: ConnectorPath[] }

// LayoutNode: { id, x, y, generation, componentId }  — x/y đã là PX
// ConnectorPath: { kind: "parent-child"|"spouse"|"ex-spouse", d: string }
```

Không import React/zustand/db-client — chỉ 2 type nội bộ (`LayoutPerson`/`LayoutRelationship`) theo structural typing, gọi được trực tiếp từ Node (`node --experimental-strip-types file.ts`, Node 26).

## Thuật toán (tóm tắt)

1. **y = đời tuyệt đối** — BFS đa gốc: gốc = người không có cha/mẹ ghi nhận (đời 0), con = cha/mẹ+1, vợ/chồng = cùng đời. Hàng đợi cạn mà còn người chưa gán đời (chu trình PARENT_OF không gốc — bug thiếu FK) → chốt 1 người ở đời 0, tiếp tục. Không loop vô hạn, không rớt người.
2. **Family unit theo ĐÚNG bộ cha/mẹ đã ghi** (không suy diễn) — con của bà 1 và bà 2 có key khác nhau, tự nhiên tách nhóm dù chưa có `union_id`.
3. **x = đệ quy reserve chiều rộng subtree** (post-order): lá = 1 cột; cha/mẹ = trung điểm các con. Một unit 2-cha-mẹ chỉ do MỘT cha/mẹ (id nhỏ nhất, xác định) xử lý — người còn lại lấy toạ độ từ CHÍNH gia đình ruột của họ. (Đây là chỗ tôi vá 1 bug tự gây: ban đầu để cả 2 cha/mẹ cùng xử lý unit chung → người xử lý sau tự căn vào toạ độ con mà người trước đã cố định → trùng khít lại đúng y hệt bug gốc. Cách khắc phục: 1 unit = 1 chủ.)
4. **Người không cha/mẹ + có vợ/chồng** (married-in, hoặc ông/bà gốc bám nhau) → ghép cạnh (`target.x + 1, +2...`), reserve trong `personWidth`. Người CÓ cha/mẹ (vd "mẹ" trong fixture 4-ông-bà) không bao giờ đi qua nhánh này — luôn định vị theo gia đình ruột.
5. Mọi đệ quy có visited-guard (placeholder trước khi đệ quy, hoặc `widthInProgress`) → chịu chu trình dữ liệu hỏng mà không treo.
6. Cross-link hôn nhân (anh em họ lấy nhau): cả hai người đều "có cha/mẹ" nên KHÔNG đi qua bước 4 — mỗi người giữ toạ độ riêng từ nhánh huyết thống của mình; hôn nhân chỉ vẽ 1 đường nối. Không clone, không thể tạo chu trình đệ quy (PARENT_OF luôn tăng đời).

## Bug đã hết — chứng minh

Script nháp (`/private/tmp/.../scratchpad/test-tree-layout.mjs`, không nằm trong repo) chạy `node --experimental-strip-types` với 5 case:

| Case | Kết quả |
|---|---|
| mình + 2 cha mẹ + 4 ông bà | **0 collision** trong 7 node (trước: bà nội trùng ông ngoại) |
| 2 anh chị em × 4 con | **0 collision** trong 12 node (trước: 3/8 con bị che) |
| chu trình — 2 anh em họ lấy nhau | 6 node, không nhân bản, `elapsed=0ms` |
| forest 2 component rời | cả 2 đều xuất hiện, `componentId` phân biệt đúng |
| chu trình PARENT_OF hỏng dữ liệu (A cha B, B cha A) | 3 node, không treo |

Connector: `buildConnectors` trả tối đa 3 `ConnectorPath` (parent-child / spouse / ex-spouse), mỗi loại 1 `d` gộp nhiều subpath — không còn 1 path/cạnh, không còn path "bridge" (đã xoá hẳn logic bridge). `FamilyTreeCanvas.tsx` áp `strokeDasharray` riêng cho `ex-spouse` nên khác `spouse` về hình vẽ.

Card: `PersonCard.tsx` cố định `w-36 h-[124px]`, tên `truncate` 1 dòng, header vai-vế luôn chiếm 1 dòng cao `h-5` (rỗng khi không có nhãn) — tên dài không đẩy card giãn, không lệch hàng.

Forest: bỏ hẳn early-return "canvas rỗng" khi `!anchor` — `computeTreeLayout` luôn trả toạ độ cho MỌI person truyền vào, kể cả không có anchor (`anchorId=null` chỉ ảnh hưởng thứ tự ưu tiên component, không chặn tính toán).

## "Thêm Anh/Chị/Em" — orphan

Chặn TRƯỚC KHI gọi `createPerson`: nếu người được chọn chưa có `PARENT_OF` nào trong `relationships`, hiện lỗi i18n (`siblingNeedsParent`) và dừng — không ghi ai. Nếu có, nối người mới với ĐÚNG bộ cha/mẹ đó (thật, không phải orphan). Đã bọc try/catch quanh toàn bộ `createPerson`/`createRelationship` — DB giờ throw ở orphan/tự-làm-cha-mình/chu trình (theo tin từ orchestrator), lỗi thật hiển thị qua `err.message`.

Còn sót: nếu `createPerson` thành công nhưng `createRelationship` sau đó throw (vd DB chặn), person đã insert vẫn còn trong DB (không rollback chung 2 lệnh) — đây là giới hạn của `src/db/persons.ts` (không thuộc quyền sửa của tôi), không phải lỗi mới do tôi gây ra.

## Lỗi tải dữ liệu vs cây rỗng (theo yêu cầu orchestrator)

`FamilyTreeCanvas.tsx`: `loadData` bắt lỗi riêng vào `loadError` state, render màn hình lỗi (`t.canvas.loadErrorTitle` + `err.message` + nút reload) — KHÔNG rơi vào nhánh "cây rỗng, mời thêm người". Thêm `isLoading` để không hiện "rỗng" trong lúc đang tải. Không gọi hàm ghi nào ở trạng thái lỗi.

## Việc 1B CHƯA làm (đúng như đề bài loại trừ)

- Pan/zoom/arrow-key/fit — tương tác, wave sau.
- A11y: touch target 44px, contrast, `prefers-reduced-motion`, focus trap — wave sau.
- Per-branch view là chế độ chính + collapse-summary + dot-LOD (`docs/tree-layout.md` §4) — chưa làm, cần viewport trước.
- Đa thê đúng nghĩa `union_id`/`partner_seq` (§5) — chưa có bảng `unions` (Phase 2). Layout hiện tại đã tách đúng theo "bộ cha/mẹ ghi nhận" (nên nhiều bà không trùng con), nhưng KHÔNG có cao độ ngang riêng theo từng bà (đường ngang union) — vì chưa có `union_id`, chỉ có cạnh SPOUSE phẳng.
- Bỏ `window.__giapha.seed` khỏi bundle production — không thuộc phạm vi được giao lần này (không phải file tôi sở hữu theo nghĩa "canvas hình học"; để roadmap xử lý riêng).

## Câu hỏi chưa giải

1. Data model hiện tại không có `union_id` — có nên tôi tự thêm cột này vào `relationships` (SPOUSE) ngay bây giờ để layout vẽ đúng cao độ đa thê, hay để nguyên cho Phase 2 (5 bảng mới) như roadmap đã định? Tôi chọn **để nguyên** (không sửa `src/db/**`), nhưng cờ lại vì đây là quyết định phạm vi, không phải kỹ thuật.
2. `ownedUnitsOf` chọn "chủ" một unit 2-cha-mẹ theo id nhỏ nhất (UUID, không xác định về mặt ngữ nghĩa cha/mẹ). Kết quả: card nào là "trục" hiển thị bên trái/phải khi vẽ connector không cố định theo giới tính. Không ảnh hưởng đúng/sai hình học, chỉ ảnh hưởng thẩm mỹ — chấp nhận được theo KISS, nhưng nêu ra để review UX nếu cần "cha luôn bên trái" là yêu cầu cứng.

Status: DONE
Summary: Tách `tree-layout.ts` thành hàm thuần đã kiểm chứng hết 2 bug trùng toạ độ + đè subtree bằng 5 test case (bao gồm chu trình + forest); gộp connector 1 path/loại, EX_SPOUSE có nét đứt riêng; card cố định + truncate; "Thêm Anh/Chị/Em" không còn ghi orphan; bổ sung phân biệt lỗi-tải vs cây-rỗng theo yêu cầu orchestrator. Build/typecheck/lint đều sạch, không lỗi mới.
Concerns/Blockers: 2 câu hỏi phạm vi ở trên (union_id, chủ unit) — không chặn merge, chỉ cần quyết định khi làm Phase 2 / polish UX.
