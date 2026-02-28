# Gia Phả - Local First Web App

## System Architecture Design

### 1. Philosophy & Approach

- **Local-first**: Chống lại sự phụ thuộc vào máy chủ trung tâm (Backend-less). Toàn bộ dữ liệu của người dùng nằm trên máy cá nhân của họ (Trình duyệt/Thiết bị).
- **Privacy Core**: Không có bất kỳ dữ liệu cây gia phả nào được lưu trữ ở một máy chủ bên thứ 3 mà người dùng không kiểm soát.
- **Offline Capable**: Ứng dụng phải hoạt động được khi không có mạng Internet.
- **Installable PWA**: Hỗ trợ cài đặt trên cả iOS (Safari -> Add to Home Screen) và Android (Chrome).

### 2. Technology Stack

#### Frontend (UI & Interaction)

- **Framework**: `Next.js` (App Router) với chế độ tĩnh (`output: export`).
- **Language**: `TypeScript` để đảm bảo type safety chặt chẽ, đặc biệt cần thiết cho các thuật toán đệ quy xử lý cây gia phả.
- **Styling**: `Tailwind CSS`, `Radix UI` (primitive components), `Framer Motion` (cho các animation bung/thu nhánh cây mượt mà).
- **Icons**: `Lucide React`.
- **State Management**: `Zustand` (để quản lý global state như: node đang chọn, chế độ xem, theme, setting ngôn ngữ).
- **Internationalization (i18n)**: `i18next` hoặc config native của Next.js để switch Anh/Việt.

#### Data Layer (Storage & Sync)

- **Local DB**: `sql.js` (SQLite compiling sang WebAssembly). Cho phép chạy một DB SQL hoàn chỉnh với các lệnh JOIN, CTE trực tiếp trên trình duyệt.
- **File System API / IndexedDB**: Lưu trữ file `*.sqlite` đã mã hóa xuống bộ nhớ trình duyệt để dùng offline.
- **Cloud Sync**: `Google Drive API` (OAuth 2.0 Client-side flow). Cung cấp cơ chế Sync-to-cloud cho file DB và Ảnh (Google Photos API).

#### Visualization (Tree Rendering)

- **Rendering**: Custom React Component tree kết hợp tính toán bằng `d3-flextree` để ra tọa độ các node. Lựa chọn này giúp kiểm soát hoàn toàn giao diện thẻ (card) thay vì dính chặt vào SVG của `D3.js`.

### 3. Application Flow

#### Lần đầu sử dụng:

1. User truy cập website (đã là PWA, load siêu nhanh từ Service Worker).
2. App yêu cầu Đăng nhập qua tài khoản Google.
3. App yêu cầu quyền truy cập Google Drive.
4. App khởi tạo một file DB mới tinh (`giapha-abc.sqlite`), tạo cấu trúc bảng.
5. Upload file nãy lên một thư mục ẩn (`AppData` hoặc thư mục do app tự tạo rành riêng) trên Drive của user.

#### Các lần sử dụng sau:

1. Mở App. App kiểm tra `IndexedDB` để load cache nếu không có mạng.
2. Nếu có mạng:
   - Ping Google Drive xem `Modified Date` của file `.sqlite` trên Drive có mới hơn file dưới Local không.
   - Nếu mới hơn: Tự động Tải file từ Drive xuống đè lên file Local.
   - Nếu bằng nhau: Tiếp tục dùng Local.
3. User thao tác (Thêm/Sửa/Xóa). Query Insert/Update được chạy thẳng vào `sql.js` (dưới Local). UI update Instant.
4. Chạy một Background Job / Debounce Timer (sau 5-10s không có thao tác), export database từ buffer của `sql.js` thành mảng Byte, sau đó Silent Upload ghi đè lên file trên Google Drive.

### 4. Extensions & Modules (Dự kiến)

- **Calendar Engine**: Sử dụng thư viện `lunar-javascript` (hoặc module tương đương) để map Can Chi và tính toán ngày Âm sang Google Calendar event (để làm module Reminder ngày Âm).
- **OCR Engine**: TBD - Cân nhắc gọi Google Cloud Vision API (do PWA có sẵn kết nối Google của tài khoản OAuth) hoặc module WebAssembly `tesseract.js` nếu muốn 100% xử lý Client.
