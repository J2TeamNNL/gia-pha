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
- [x] Phân tích ưu/nhược điểm của repo: `Gia-Pha-Dien-Tu`.
- [x] Phân tích ưu/nhược điểm của repo: `giapha-os`.
- [x] Phân tích ưu/nhược điểm của repo: `AncestorTree`.
- [x] Chốt công nghệ và Data Schema (có hỗ trợ PWA và Google Drive sync).
- [ ] Khảo sát thư viện OCR (Tesseract.js) để scan CCCD và Google Photos API (cho Phase 3).
- [ ] Khởi tạo bộ khung dự án MVP (Next.js + sql.js).

## 3. Flow

- Người dùng truy cập website và có thể bấm cài đặt thành PWA (app trên iOS/Android).
- Người dùng đăng nhập bằng tài khoản Google.
- Ứng dụng kết nối với Google Drive API (yêu cầu quyền truy cập thư mục của app).
- Đồng bộ file dữ liệu (JSON/SQLite) từ Drive về máy trạm (lưu trong IndexedDB của trình duyệt).
- Người dùng xem, thêm, sửa, xóa thông tin trên giao diện.
- Mọi dữ liệu sửa đổi được lưu offline lập tức (IndexedDB).
- Trigger một tiến trình ngầm (background sync) để upload/update file dữ liệu ngược lại lên Google Drive.

## 4. Changelog

- **2026-02-28**: Khởi tạo file `.plan`. Tải bộ source tham khảo (`Gia-Pha-Dien-Tu`, `giapha-os`, `AncestorTree`).
