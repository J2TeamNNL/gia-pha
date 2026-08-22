---
title: "Đề xuất chờ duyệt — data model v2 + ưu/nhược từng tính năng"
status: awaiting-approval
created: 2026-08-22
artifact: https://claude.ai/code/artifact/2a1f9a2a-8f5f-4870-81ed-8e4b6e4b0cf3
---

# Đề xuất chờ duyệt

Bản ghi văn bản của artifact duyệt thiết kế. **Chưa mục nào được đưa vào `docs/`.**

Chi tiết đầy đủ: `proposal-data-model.md`, `proposal-kinship.md`, `migration.md` (cùng thư mục).

## Sai sót đã sửa

Anh duyệt **cấu trúc thư mục**, không duyệt **thiết kế**. Đã đẩy `data-model.md` + `kinship.md` vào `docs/` (tầng "khẳng định") khi chưa ai xem → đã rút về thành `proposal-*.md`.

`docs/` hiện chỉ còn `architecture.md` + `culture-vietnam.md` — hai file này là **phát hiện đã kiểm chứng** (đọc code, đo trên gia phả thật 292 người), không phải lựa chọn thiết kế.

## Nhu cầu của user — cách hiểu hiện tại

| User nói | Yêu cầu suy ra |
|---|---|
| "v1 là cho tôi dùng nên chỉ cần 1 người sử dụng trước đã" | V1 = **nhập được gia phả nhà mình, xem được cây, không mất dữ liệu**. Không cộng tác/phân quyền/share. |
| Giữ vision local-first | Không backend. Trình duyệt + Drive của user. |
| Văn khấn / lịch vạn niên: "chưa cần, lên plans làm sau" | Không thuộc v1. |
| Codegraph: "tính sau" | Không cài phiên này. |
| README: đa thê, con đẻ/rể/dâu, danh xưng, ngày giỗ, Can Chi, tránh trùng tên tổ tiên | Gia phả 15 đời → các case này **chắc chắn gặp**. |

## Vì sao 7 bảng — và đề xuất giảm còn 5

Agent thiết kế nhắm "đúng về dữ liệu", chưa cân với việc v1 chỉ 1 người dùng.

| Bảng | Trạng thái | Ghi chú |
|---|---|---|
| `persons` | **Giữ** | Không có lựa chọn khác. Cho phép **không có tên riêng** (gia phả thật ghi "Bà ‹tên chồng›"). Danh hiệu tách field riêng. |
| `unions` | **Cần quyết** | 2 bảng vs 1 bảng — xem dưới |
| `union_partners` | **Cần quyết** | `partner_seq` = thứ tự cuộc hôn nhân đó *trong đời người đó*. Ông 3 bà → ông seq 1/2/3; mỗi bà seq 1. Đa thê/đa phu chung cơ chế, **không code nào đọc giới tính** |
| `parentages` | **Giữ** | Mỗi dòng 1 cha hoặc mẹ + `kind` + `union_id` + `is_lineage` |
| `date_facts` | **Cần quyết** | bảng riêng vs cột inline — xem dưới |
| `relationship_overrides` | **Đề xuất hoãn** | Chỉ có ích khi engine xưng hô đã chạy |
| `app_settings` | **Đề xuất cắt** | Tách đôi: cỡ chữ/ngôn ngữ → localStorage; vùng miền + policy tháng nhuận → hoãn cùng bảng 6 |

**→ Đề xuất v1 = 5 bảng**: `persons`, `unions`, `union_partners`, `parentages`, `date_facts`.

Hoãn được 2 bảng cuối vì chúng là **bảng mới**, không phải sửa bảng cũ. 5 bảng kia **không hoãn được** — sửa cấu trúc hôn nhân sau khi đã nhập vài trăm người là migration đau nhất của dự án.

### `is_lineage` — luật văn hoá mới codex tìm ra

**Con thừa tự**: cháu được nhận về nối dõi cho nhánh không con trai. Người đó **giữ cả** cạnh cha ruột và cạnh cha nuôi — cả hai đều hợp lệ — nhưng chỉ một cạnh quyết định thuộc chi nào. `kind` không diễn đạt được. Nếu bỏ: con thừa tự bị xếp sai chi, hoặc vào cả hai chi.

### Hôn nhân: 2 bảng vs 1 bảng

| 2 bảng (đề xuất) | 1 bảng `partner_a/partner_b` |
|---|---|
| + Đa thê/đa phu đối xứng hoàn toàn | + Ít 1 bảng, ít 1 join |
| + "Bà thứ mấy" đúng theo từng người | + Tính đối xứng ép bởi cấu trúc, không cần trigger |
| + "Mọi hôn nhân của X" = 1 index seek | − `WHERE a=X OR b=X` → 2 index, code 2 nhánh |
| + Mở đường hôn nhân nhóm nếu cần | − Thứ tự vợ/chồng theo từng người phải thêm 2 cột |

**Đề xuất: 2 bảng.** Cái đắt không phải số bảng mà là "con này của bà nào". 1 bảng phải tự thêm cột bù và cuối cùng cũng ra chừng đó phức tạp.

### Ngày tháng: bảng riêng vs cột inline

Mỗi ngày cần 7 thông tin (lịch âm/dương, năm, tháng, ngày, **có phải tháng nhuận**, độ chính xác, nguồn) × 5 loại ngày (sinh, mất, **giỗ**, cưới, an táng).

| Bảng riêng (đề xuất) | Cột inline trong `persons` |
|---|---|
| + 1 bảng thay vì 35 cột | + Đọc 1 người = 1 SELECT, không join |
| + Ràng buộc viết **1 lần**, không lặp 5 lần | + Dễ debug bằng tay |
| + "Giỗ sắp tới" thành index seek | − 35 cột, 6 ràng buộc lặp 5 lần |
| + Thêm loại ngày mới không cần migration | − **Đúng lỗi đã bị mổ công khai**: dev bình luận về giapha-os — *"cách bạn define day trong Person model cũng không hợp lý vì bạn chia quá nhiều"* |

**Đề xuất: bảng riêng.** Đây là chỗ duy nhất trong thiết kế mà đối thủ đã bị chỉ ra làm sai, bằng văn bản, ở đúng chỗ này.

## Ưu / nhược từng tính năng

Xếp theo thứ tự đề xuất làm. Cột "nếu bỏ" cho biết hoãn có rẻ không.

### P1 · Không mất dữ liệu — đề xuất đảo lên đầu roadmap
4 lỗi Critical đều là mất dữ liệu, dồn gần hết vào `src/db/client.ts`. Chưa có đường export/backup nào tồn tại.
- **Ưu**: user là người đầu tiên nhập cây thật · reviewer ước ~2 ngày, gần như 1 file · mở luôn export/import làm escape hatch
- **Nhược**: chưa thấy gì mới trên UI
- **Nếu bỏ**: cột đầu tiên thêm ở v0.6 sẽ **xoá sạch cây** (hàm kiểm schema chỉ kiểm 5/25 cột) · iOS xoá storage sau 7 ngày, không gì chặn

### P2 · Đa thê đúng cấu trúc — chờ duyệt phần bảng
Không đối thủ nào **render** được đa thê. Dự án duy nhất có model dùng nhãn phẳng `"Vợ thứ"` / `"Thứ thất"` — không trả lời được "con của bà nào", backend đã chết.
- **Ưu**: yêu cầu số 1, lặp lại cả 5 post · gia phả 15 đời chắc chắn gặp · phần khó còn lại là **layout**, không phải dữ liệu
- **Nhược**: phải migration dữ liệu đang có
- **Nếu hoãn**: **đắt nhất trong mọi mục** — migration đau nhất sau khi đã nhập

### P3 · Cây vẽ đúng, không đè nhau
Hiện tại: **bà nội ≡ ông ngoại trùng khít toạ độ** ở gia đình phổ biến nhất; 2 em × 4 con → 3/8 card bị che.
- **Ưu**: đã đo được công thức từ 2 sản phẩm chạy được — key y theo **đời tuyệt đối × pitch hằng số** + card box cố định truncate tên → variance 0 px · gộp connector thành **một** `<path>` thay vì 1 path/cạnh · user thấy ngay
- **Nhược**: cần tách `FamilyTreeCanvas.tsx` (đang gánh cả layout + render + tương tác)
- **Nếu bỏ**: không nhập được gia phả, vì cây nào cũng có ông bà

### P4 · Ngày giỗ âm lịch + tháng nhuận
- **Ưu**: tính offline thuần, zero-infra · là lý do dùng app dịp Tết · rẻ nếu làm cùng `date_facts`
- **Nhược**: cần thư viện convert bundle offline, pin version, test năm biên · tháng nhuận cần user chọn policy
- **Nếu bỏ**: ngày giỗ sai — mà đó là dữ liệu cần nhất

### P5 · PWA installable + offline
Hiện **không** phải PWA: `public/` chỉ có 4 svg mặc định của Next.
- **Ưu**: điều kiện để iOS **không** xoá dữ liệu sau 7 ngày · về quê không mạng vẫn tra được · không cần store
- **Nhược**: service worker cache sai bản là nguồn bug mới. Reviewer cảnh báo: shell cũ trong SW có thể chạy code cũ và **xoá cây đã migrate**
- **Nếu bỏ**: mất dữ liệu trên iOS

### P6 · Xưng hô tự động — đề xuất hoãn v2
Comment like cao nhất (58) đòi. Tác giả giapha-os: *"em chưa nghĩ ra cách giải quyết"*. KinTree dùng tuổi nên sai.
- **Ưu**: khác biệt lớn nhất so với đối thủ · đúng nhu cầu Tết · schema đã sẵn
- **Nhược**: tốn nhất — **14 case** quy tắc đệ quy không đủ · cần bảng từ vựng Bắc/Trung/Nam mà **chưa có nguồn kiểm chứng được**
- **Nếu hoãn**: rẻ — chỉ thêm bảng mới, không migration

### P7 · Google Drive sync
`src/lib/drive.ts` là **3 hàm `console.log`**. "Background sync" trong plan cũ **không khả thi** — client browser-only không giữ refresh token.
- **Ưu**: backup thật ngoài trình duyệt · dữ liệu ở Drive của user — đúng cái đối thủ đang thu phí
- **Nhược**: phải là **user bấm**, không thể ngầm · không xác nhận được Drive hỗ trợ `If-Match` → never-overwrite + bản conflict
- **Đề xuất**: v1 làm **export/import file** trước (rẻ, chắc, đủ để không mất). Drive sync sau.

### P8 · Văn khấn · lịch vạn niên · in bảng tông đồ — user đã nói để sau
In "bảng tông đồ" đẹp thì **chưa ai làm được**. Codex đề nghị cắt khỏi giai đoạn đầu. **Lưu ý ngược lại**: chúng rẻ, offline, zero-infra và chính là thứ làm nên "sản phẩm mùa Tết" → ứng viên tốt cho **v2**, không phải v3.

## Cần user quyết — 8 câu

1. **5 bảng cho v1** (bỏ `relationship_overrides` + `app_settings`) — đồng ý?
2. **Hôn nhân: 2 bảng hay 1 bảng?**
3. **Ngày tháng: bảng `date_facts` riêng hay cột inline?**
4. **Xưng hô: hoãn v2, hay có ngay v1?**
5. **1 máy hay 2 máy?** → quyết định có cần phát hiện xung đột Drive.
6. **Đảo durability lên phase 1?**
7. **Xoá `.plan/` + `.agent/` sau migrate, hay để file trỏ?** (mặc định: để lại)
8. **Thêm test runner?** Chưa có gì trong `package.json`.

## Rủi ro phải nói rõ

Agent thiết kế đã validate migration bằng `sqlite3` trên DB nháp: 16 người / 27 cạnh, 3 bà vợ chia con đúng, con nuôi phân biệt nhận-bởi-cả-hai vs bởi-một-người, anh em họ lấy nhau tạo người tới được bằng 2 đường huyết thống mà **không clone** (`distinct_persons == rows_in_persons_table`), cycle breaker xoá đúng 1 cạnh xấu được tiêm vào chứ không phá 3 parentage hợp lệ.

**Nhưng chưa có test nào trong repo.** Mọi khẳng định đứng bằng DB nháp, không bằng test chạy lại được. Đó là câu 8, và là câu quan trọng nhất trong tám câu.

Thêm một rủi ro migration cụ thể: chạy `isSchemaValid()` **hiện tại** trên file v2 trả `false` → gọi `clearIndexedDB()`. Thử shim bằng generated column không được (generated column **vô hình với `pragma_table_info`**, đã kiểm chứng cả VIRTUAL và STORED). Nên v2 phải ghi vào **key IndexedDB mới**, để nguyên blob v1 ở chỗ code cũ mong đợi. Đó là cách làm cho việc xoá dữ liệu **bất khả thi về cấu trúc**, không chỉ là "tránh".

## Câu chưa trả lời

- Có bao giờ xoá blob v1 không, và khi nào?
- Bảng từ vựng xưng hô Bắc/Trung/Nam đầy đủ — chưa có nguồn kiểm chứng.
- Khi ngày giỗ gốc ở tháng nhuận, các gia đình thực tế xử lý thế nào?
