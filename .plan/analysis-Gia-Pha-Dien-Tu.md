# Phân tích Gia-Pha-Dien-Tu

🔗 **Nguồn:** [0xAstroAlpha/Gia-Pha-Dien-Tu](https://github.com/0xAstroAlpha/Gia-Pha-Dien-Tu)

## 1. Tech Stack

- Frontend: Next.js 16 (App Router), TailwindCSS, Shadcn UI
- State Management: Zustand, React Query
- Animation: Framer Motion
- Backend / DB: Supabase (PostgreSQL + Auth)
- Thuật toán vẽ cây: Tự code bằng React kết hợp thẻ `<svg>` vẽ đường dẫn (paths) và tính toán tọa độ (BFS layout).

## 2. Ưu điểm (Có thể học hỏi)

- **Giao diện (UI/UX) cực kỳ mượt mà và đẹp mắt:** Sử dụng Framer Motion và Tailwind tối ưu trải nghiệm người dùng rất tốt, cảm giác cao cấp.
- **Tính năng Auto-Collapse:** Tự động thu gọn các nhánh cây ở các đời xa để không bị rối mắt (thuật toán culling node trên màn hình).
- **Phân quyền và đóng góp:** Có cơ chế cho người dùng bình thường "đề xuất đóng góp", admin sẽ duyệt (Approve/Reject) để thay đổi dữ liệu gốc.
- **Quản lý quan hệ (Data Modeling):** Bảng `people` và `families` (gia đình gồm father_handle, mother_handle và array children) - rất trực quan cho việc vẽ cây.

## 3. Nhược điểm (Không phù hợp với định hướng hiện tại)

- Phụ thuộc hoàn toàn vào dịch vụ lưu trữ bên thứ 3 (Supabase) cho Database. Nếu Supabase thay đổi chính sách free, dự án sẽ gặp khó khăn. Định hướng của chúng ta là **Local-first + Google Drive sync** sẽ khắc phục được điểm này.
- Thuật toán layout do tự viết nên sẽ khó mở rộng nếu cây có nhiều cấu trúc phức tạp (đứt đoạn, ly dị/đa thê, con nuôi...). Rất cần lưu ý phần này để chọn thư viện đồ thị hỗ trợ tốt hơn.
