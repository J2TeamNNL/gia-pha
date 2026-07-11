# Gia Phả - Local First Web App

Website quản lý gia phả với mục tiêu bảo mật tối đa, dễ dàng sử dụng và lưu trữ dữ liệu tại cá nhân người dùng. Repository `gia-pha` là nơi phát triển chính thức; các phần prototype được thay thế từng phần ngay trong repository này theo `.plan/`.

## Trạng thái hiện tại

- Runtime: Vite, React, TypeScript, SQLite WASM trong Worker, OPFS, catalog đa cây, tìm kiếm thành viên và side panel.
- Schema domain có unions, partners, children, partial dates, provenance; validation self-link, duplicate, dangling reference, ancestor cycle chạy trước khi ghi.
- Baseline lint, typecheck, unit test, build và Playwright đã chạy trong CI.
- Browser thiếu HTTPS, COOP/COEP, SharedArrayBuffer, Worker hoặc OPFS sẽ thấy lỗi rõ ràng; không fallback sang storage tạm.

Chưa dùng runtime hiện tại để lưu dữ liệu gia phả quan trọng hoặc deploy production cho đến khi các task trong `.plan/task.md` hoàn thành.

## MVP đang xây

- Quản lý nhiều cây gia phả độc lập, lưu local trong trình duyệt.
- CRUD thành viên, quan hệ phức tạp (đa thê/đa phu, con đẻ/con nuôi, cha mẹ không rõ), tìm kiếm, chọn người tham chiếu.
- Sơ đồ cây trực quan: focus/depth, pan/zoom, layout chạy trong worker, giới hạn 500 node hiển thị.
- Backup/trao đổi bằng Native JSON có version.
- Không tài khoản, không telemetry; dữ liệu không tự gửi đi đâu.

## Tính năng dự kiến (roadmap sau MVP)

Các ý tưởng gốc của dự án, giữ nguyên trên roadmap chính thức:

- **Cloud Sync qua Google Drive**: toàn bộ dữ liệu lưu trên Drive cá nhân của người dùng, không phụ thuộc database server.
- **PWA**: cài trên Android/iOS như ứng dụng độc lập.
- **Tính toán danh xưng**: tự động xác định xưng hô (Anh/Em/Bác/Cháu…) từ hướng nhìn người tham chiếu.
- **Calendar & văn hóa Việt**: lưu ngày âm + Can Chi (Giáp Tý, Ất Sửu…), nhắc sinh nhật/ngày giỗ (Âm/Dương), đồng bộ vào Google Calendar.
- **Gợi ý đặt tên con**: tra cứu cây để tránh đặt tên trùng các bậc trưởng bối.
- **Tử Vi & Lịch Kỵ**: cảnh báo ngày kỵ (cưới hỏi, sinh nở, động thổ…); chỉ gợi ý tránh ngày xấu, không khuyến khích mê tín dị đoan.
- **Tiện ích nhập liệu**: quét CCCD/ID Card để điền thông tin tự động.
- **Trích xuất sơ đồ ra file ảnh** để chia sẻ.
- **Ảnh & Google Photos**: nhúng ảnh từ Google Photos cho từng thành viên (lưu ý: ảnh nhúng khó đóng gói khi export JSON — cần thiết kế riêng).
- **Google Maps**: chỉ đường tới địa chỉ thành viên.
- **GEDCOM**: import/export chuẩn trao đổi gia phả quốc tế.

## Tài liệu

Bắt đầu tại [`.plan/README.md`](.plan/README.md) — dẫn đến product overview, kiến trúc, data model, quyết định, changelog và task backlog.

## Tham khảo

Phân tích rút kinh nghiệm từ các dự án mã nguồn mở:

- [Gia-Pha-Dien-Tu](https://github.com/0xAstroAlpha/Gia-Pha-Dien-Tu)
- [giapha-os](https://github.com/homielab/giapha-os)
- [AncestorTree](https://github.com/Minh-Tam-Solution/AncestorTree)

## Vibe code with ❤️ by J2TeamNNL
