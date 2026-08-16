# Phân tích giapha-os

🔗 **Nguồn:** [homielab/giapha-os](https://github.com/homielab/giapha-os)

## 1. Tech Stack

- Frontend: Next.js 16 (App Router), Tailwind CSS
- UI/UX: Framer Motion
- Database / Auth: Supabase (PostgreSQL)
- Tính năng báo cáo & Export: `jspdf`, `html-to-image`
- Xử lý ngày Âm: `lunar-javascript`

## 2. Ưu điểm (Có thể học hỏi)

- **Tính toán danh xưng (Kinship):** Tự động xác định cách gọi tên (Bác, Chú, Cô, Dì...). Điều này rất thiết thực với văn hóa Việt Nam.
- **Ngày Âm / Dương:** Tích hợp cực kỳ tốt việc quy đổi và theo dõi ngày giỗ bằng lịch Âm thông qua thư viện `lunar-javascript` (cần đưa tính năng này vào dự án của chúng ta).
- **Chế độ xem sơ đồ đa dạng:** Có cả dạng Cây (Tree) truyền thống và dạng Sơ đồ tư duy (Mindmap) giúp hiển thị được luồng thông tin khác nhau.
- **Export Data:** Cho phép xuất dữ liệu ra file JSON, CSV, GEDCOM và xuất biểu đồ ra PDF/Image.

## 3. Nhược điểm

- Giống như `Gia-Pha-Dien-Tu`, dự án này vẫn phụ thuộc chặt chẽ vào Supabase làm cơ sở dữ liệu. Để chạy offline hoàn toàn thì phải cấu hình phức tạp. Không phù hợp với định hướng Local-first + PWA gọn nhẹ như chúng ta mong muốn.
