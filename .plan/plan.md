# Gia Phả - Local First Web App

## 1. Plan

- Phân tích các mã nguồn mở về gia phả để rút ra bài học.
- Chốt tech stack (PWA installable app, React/Next.js/Vue, Google Drive API, Local DB).
- Thiết kế Data Modeling (hỗ trợ song ngữ Anh-Việt, tách rõ phần First Name / Last Name / Middle Name).
- Thiết kế Data Modeling nâng cao: Hỗ trợ đa thê/đa phu, lưu location Google Maps cho từng thành viên, phân loại con (đẻ, rể, dâu).
- Lên lộ trình phát triển thành 3 Phase: **MVP**, **Văn Hóa (V2)**, và **Mạng Xã Hội Gia Đình (V3)**.
- Triển khai **Version 1 (MVP)** với cấu trúc core: Auth (Google), Google Drive Sync, Local SQLite, Vẽ sơ đồ.

## 2. Tasks

- [x] Clone các repo tham khảo vào thư mục `references`.
- [x] Phân tích ưu/nhược điểm của các repo tham khảo.
- [x] Chốt công nghệ và Data Schema (có hỗ trợ PWA và Google Drive sync).
- [x] Khởi tạo bộ khung dự án MVP (Next.js + sql.js).
- [x] Onboarding Screen: Tách riêng Họ/Tên đệm/Tên + Autofill + Phone (+84).
- [x] Đa ngôn ngữ (i18n): VI/EN labels, chọn ngôn ngữ trên Header.
- [x] Sửa lỗi NOT NULL constraint và SQLite Caching bug.
- [x] Sửa lỗi "Empty Tree" sau Onboarding (sql.js minification bug).
- [x] Redesign PersonCard: Glassmorphism, soft shadow, ring borders.
- [x] Redesign FamilyTreeCanvas: Infinite panning, CSS tree connectors.
- [x] Nút (+) Thêm Nhánh Trực Tiếp: Thêm Cha/Mẹ, Con, Vợ/Chồng, Anh Chị Em.
- [x] Auto-create Relationship khi thêm từ nút (+).
- [x] Responsive Mobile UI: Header & SidePanel.
- [/] Cập nhật `.plan/plan.md` và duy trì single source of truth.
- [ ] Gợi ý Họ tự động cho người mới (từ gia phả hiện có).
- [ ] Tính toán danh xưng tự động.
- [ ] Google Drive Sync (lưu/tải file SQLite lên Drive API).
- [ ] **Tử Vi / Bói Toán**: Đề xuất tên cho con, ngày cưới/sinh. Cảnh báo ngày kỵ, tránh mê tín.
- [ ] Quét CCCD/Hộ khẩu (Tesseract OCR) để tự động điền thông tin.
- [ ] Import/Export CSV, GEDCOM.
- [ ] Tích hợp Google Calendar nhắc Sinh nhật, Ngày giỗ.
- [ ] Xuất sơ đồ cây ra file ảnh (PNG/PDF).

## 3. Flow

- Người dùng truy cập website và có thể bấm cài đặt thành PWA (app trên iOS/Android).
- Người dùng đăng nhập bằng tài khoản Google.
- Ứng dụng kết nối với Google Drive API (yêu cầu quyền truy cập thư mục của app).
- Đồng bộ file dữ liệu (JSON/SQLite) từ Drive về máy trạm (lưu trong IndexedDB của trình duyệt).
- Người dùng xem, thêm, sửa, xóa thông tin trên giao diện.
- Mọi dữ liệu sửa đổi được lưu offline lập tức (IndexedDB).
- Trigger một tiến trình ngầm (background sync) để upload/update file dữ liệu ngược lại lên Google Drive.

## 4. Changelog

### [0.3.0] - 2026-03-06

- **Added**: Nút (+) Thêm Nhánh Trực Tiếp (Top, Bottom, Left, Right).
- **Added**: Auto-create Relationship & Dynamic Form Header.
- **Changed**: Redesign PersonCard (Glassmorphism) & FamilyTreeCanvas (Infinite panning, CSS connectors).

### [0.2.0] - 2026-03-05

- **Fixed**: Lỗi NOT NULL constraint & Empty Tree (sql.js browser binding/minification).
- **Added**: Responsive Mobile UI, i18n (VI/EN), Gợi ý Họ (Autocomplete).
- **Changed**: Onboarding Form tách riêng Họ/Tên đệm/Tên.

### [0.1.0] - 2026-03-04

- Khởi tạo dự án Next.js PWA + sql.js.
- Database Schema: `persons` (25 fields), `relationships`.
- Onboarding Screen MVP.

### **2026-02-28**

- Khởi tạo file `.plan`. Tải bộ source tham khảo.
