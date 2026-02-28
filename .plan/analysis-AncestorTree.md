# Phân tích AncestorTree

🔗 **Nguồn:** [Minh-Tam-Solution/AncestorTree](https://github.com/Minh-Tam-Solution/AncestorTree)

## 1. Tech Stack

- Frontend: Next.js 16, React 19, Tailwind CSS 4, Radix UI
- Desktop app: Electron 34, **`sql.js` (WASM SQLite)**
- Database (Web): Supabase
- State Management: React Query

## 2. Ưu điểm (Cực kỳ xuất sắc & Cần copy học hỏi)

- **Local-first thực thụ:** Ở phiên bản Desktop (v1.8), họ đã sử dụng **SQLite chạy trên trình duyệt (thông qua WebAssembly - `sql.js`)**. Đây chính xác là những gì chúng ta cần cho bài toán "Lưu ở máy cá nhân người dùng, không cần server". File `.sqlite` này có thể dễ dàng được sync lên Google Drive.
- **Văn hóa Việt Nam tinh tế:**
  - Hỗ trợ đổi ngày âm dương.
  - Phân chi / nhánh rõ ràng.
  - Tính năng "Cầu đương" (phân công việc họ theo vòng lặp bằng thuật toán DFS).
  - Vinh danh, Quỹ khuyến học, Hương ước dòng họ.
  - Quản lý đa thê / đa phu rất tốt.
- **Tài liệu SDLC:** Tổ chức cấu trúc code và document rất chuyên nghiệp.
- **Bảo mật:** Làm RLS (Row Level Security) và phân quyền cực mạnh. Middleware check kỹ.

## 3. Nhược điểm

- Mặc dù bản Desktop dùng SQLite local, nhưng bản Web lại vẫn ràng buộc với Supabase. Chúng ta sẽ làm **Web WebAssembly SQLite** (chạy thẳng JSON/SQLite local trên chính Web App) thay vì phải build Desktop App như họ.

## Kết luận

- **Data Architecture:** Học từ `AncestorTree` cách thiết kế Schema cho SQLite (bảng people, families).
- **Lịch Âm & Danh xưng:** Học từ `giapha-os` (`lunar-javascript`).
- **UI/UX & Animation:** Học từ `Gia-Pha-Dien-Tu` (Framer motion collapse/expand tree).
