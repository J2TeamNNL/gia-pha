# Tài liệu dự án Gia Phả

Ứng dụng quản lý gia phả **local-first**: dữ liệu nằm trong trình duyệt của người dùng và đồng bộ lên Google Drive của chính họ. Không có backend server.

## Nguyên tắc của thư mục này

**`docs/` khẳng định — `plans/reports/` chứng minh.**

- `docs/` chứa tài liệu **evergreen**: luật domain, quyết định kiến trúc, spec. Đọc ở đây để biết dự án *là gì* và *phải tuân theo gì*.
- `plans/reports/` chứa **bản ghi theo thời điểm**: kết quả review, teardown đối thủ, trích dẫn phản hồi người dùng. Có ngày, không sửa lại. Chúng mục theo thời gian.
- Mỗi khẳng định trong `docs/` có dòng trích nguồn về report tương ứng, để lần được về bằng chứng gốc và biết nó đã cũ chưa.

## Đọc theo thứ tự nào

| Bạn cần | Đọc |
|---|---|
| Hiểu dự án đang ở đâu, cái gì đã có / chưa có | [architecture.md](architecture.md) |
| Làm việc với dữ liệu người, quan hệ, ngày tháng | [culture-vietnam.md](culture-vietnam.md) — *data model chốt 5 bảng (D23–D25); DDL ở `plans/260821-2350-restructure-v1/proposal-data-model.md`* |
| Sửa cây gia phả trên canvas | [tree-layout.md](tree-layout.md) |
| Làm tính năng xưng hô / vai vế | *hoãn v2 (D26). Spec: `plans/260821-2350-restructure-v1/proposal-kinship.md`* |
| Làm đồng bộ, backup, export | [sync-durability.md](sync-durability.md) |
| Thêm field, thêm tích hợp, thêm dependency | [privacy.md](privacy.md) |
| Hiểu vì sao dự án chọn hướng này | [decisions.md](decisions.md) |
| Biết đối thủ đã làm gì, còn trống chỗ nào | [competitive-landscape.md](competitive-landscape.md) |
| Thư mục này là gì, xoá được không | [repo-layout.md](repo-layout.md) |

Roadmap và kế hoạch triển khai: [`../plans/roadmap.md`](../plans/roadmap.md).

## Luật bất biến

Bốn điều này không được vi phạm mà không sửa [decisions.md](decisions.md) trước:

1. **Không backend server.** Dữ liệu ở trình duyệt + Drive của user.
2. **Không dependency gọi mạng lúc runtime.** Mọi thứ bundle offline. Xem [privacy.md](privacy.md).
3. **Không bao giờ xoá dữ liệu người dùng để "sửa" schema.** Xem [sync-durability.md](sync-durability.md).
4. **`con dâu` / `con rể` / `cháu dâu` là đường dẫn suy ra, không phải thuộc tính của người.** Xem [culture-vietnam.md](culture-vietnam.md).

> Trạng thái: toàn bộ file trong `docs/` là **phát hiện đã kiểm chứng hoặc quyết định đã duyệt**. DDL chi tiết và kế hoạch migration còn ở `plans/260821-2350-restructure-v1/` vì là bản ghi theo thời điểm.
