# Gia Phả

Repository `gia-pha` là nơi phát triển chính thức của ứng dụng gia phả local-first **Gia Phả**. Các phần prototype hiện có sẽ được thay thế từng phần ngay trong repository này theo kiến trúc đích đã được ghi nhận trong `.plan/`.

## CURRENT — Trạng thái hiện tại

- Runtime hiện dùng Vite, React, TypeScript, SQLite WASM trong Worker, OPFS, catalog đa cây và giao diện cây/side panel; các module domain/graph cũ vẫn là baseline prototype.
- Google Drive chỉ là mock; chưa có đăng nhập hoặc đồng bộ thật.
- Đã có baseline lint, typecheck, unit test, build và Playwright; phạm vi test vẫn còn tối thiểu.
- Browser thiếu HTTPS, COOP/COEP, SharedArrayBuffer, Worker hoặc OPFS sẽ thấy lỗi runtime rõ ràng; ứng dụng không fallback sang storage tạm thời.
- Tree database dùng migrations có version và transaction rollback; schema domain có unions, partners, children, partial dates và provenance. Các validation cho self-link, duplicate membership, dangling reference và ancestor-cycle chạy trước khi ghi quan hệ.
- Canvas hiện tại chưa dựng cây theo dữ liệu quan hệ thực tế.

Do đó, không dùng runtime hiện tại để lưu dữ liệu gia phả quan trọng hoặc triển khai production cho đến khi các task nền tảng và hardening trong `.plan/task.md` hoàn thành.

## TARGET — Hướng sản phẩm

Mục tiêu triển khai của **Gia Phả** trong chính repository này:

- Website open source cho người dùng phổ thông và có thể self-host.
- Dữ liệu được xử lý và lưu trong trình duyệt, không tự động gửi lên server.
- Hỗ trợ nhiều cây, Native JSON, GEDCOM và các adapter import/export mở rộng.
- Không tài khoản, telemetry hoặc server lưu gia phả trong core MVP.
- Không tạo repository greenfield hay đổi tên repository trong phạm vi hiện tại.

## Tài liệu

Bắt đầu tại [`.plan/README.md`](.plan/README.md). Tài liệu này dẫn đến product overview, kiến trúc mục tiêu, data model, quyết định kèm lý do, code review, changelog và task backlog.

Không xem các file phân tích cũ hoặc Git history là mô tả tính năng hiện tại nếu chưa đối chiếu với [legacy review](.plan/reviews/2026-07-11-legacy-review.md).
