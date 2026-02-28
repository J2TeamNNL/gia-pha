# Gia Phả - Local First Web App

## 1. Plan

- Phân tích các mã nguồn mở về gia phả để rút ra bài học.
- Chốt tech stack (PWA installable app, React/Next.js/Vue, Google Drive API, Local DB).
- Thiết kế Data Modeling (hỗ trợ song ngữ Anh-Việt, tách rõ phần First Name / Last Name / Middle Name).
- Thiết kế UI/UX và logic vẽ sơ đồ cây tối ưu.
- Lên cấu trúc backend "mỏng" nhất có thể (nếu cần thiết cho tính năng chia sẻ sau này).
- Triển khai MVP.

## 2. Tasks

- [x] Clone các repo tham khảo vào thư mục `references`.
- [x] Phân tích ưu/nhược điểm của repo: `Gia-Pha-Dien-Tu`.
- [x] Phân tích ưu/nhược điểm của repo: `giapha-os`.
- [x] Phân tích ưu/nhược điểm của repo: `AncestorTree`.
- [x] Chốt công nghệ và Data Schema (có hỗ trợ PWA và Google Drive sync).
- [ ] Khởi tạo bộ khung dự án.

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
