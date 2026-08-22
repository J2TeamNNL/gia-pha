# FB Link 3 — AncestorTree (Dang The Tai, 25/02)
URL: https://www.facebook.com/share/p/16qD2cZ6XB/
Traction: 1K reactions · 22 comments · **321 shares** (share/comment ratio cao nhất → nội dung định vị tốt)
Repo: github.com/Minh-Tam-Solution/AncestorTree · Site: ancestortree.info/welcome · MIT
Stack: Next.js 16 + React 19 + Supabase + Vercel · $0/tháng · deploy ~30 phút

## Số liệu thị trường họ dùng để định vị (đáng mượn)
- VN có **hơn 54 họ lớn**, **~10.000+ hội đồng gia tộc**.
- Gia phả hiện nằm trên **giấy / file Word rời rạc / trí nhớ các bậc cao niên**.
- **MyHeritage, FamilySearch hoạt động tốt ở phương Tây nhưng KHÔNG hiểu cấu trúc gia tộc Việt**: âm lịch, ngày giỗ, chi–nhánh–đời, can chi.
→ Đây chính là positioning statement cho dự án ta.

## Cách họ làm (process, không phải sản phẩm)
15 giờ, orchestrate 8 AI agents theo TinySDLC + MTS-SDLC-Lite → 9 tài liệu SDLC (Vision → BRD → Technical Design → UI/UX → Review), 77 functional + 17 non-functional requirements, 13 bảng PostgreSQL, full Next.js app. Post là "public experiment" chứng minh AI-assisted SDLC, không phải commercial.

## Feature VN-specific — nhiều cái ta CHƯA nghĩ tới
| Feature | Ghi chú cho ta |
|---|---|
| Lịch âm dương & ngày giỗ | ta đã plan |
| **Tự động tính chi / nhánh / đời** | ta chưa có concept "chi/nhánh" — chỉ có generation |
| Can Chi (Giáp Tý, Ất Sửu…) | ta đã plan |
| **Chính tộc / Ngoại tộc** | khớp với con dâu(nội) vs con rể(ngoại) từ link 2 |
| **Vinh danh & quỹ khuyến học dòng họ** | MỚI — bảng vinh danh + quỹ học bổng dòng họ |
| **Hương ước gia tộc** | MỚI — văn bản quy ước dòng họ |
| **"Cầu đường" — phân công theo lễ tộc (DFS algorithm)** | MỚI — phân công nhiệm vụ trong lễ tộc theo thuật toán duyệt cây |
| Quan hệ gia đình trực quan trong từng hồ sơ | mini-tree trong trang cá nhân |

## Comment quan trọng nhất của CẢ 5 LINK
> **Lê Công Thành (23 like): "Nếu lưu dữ liệu gia phả của mọi người trên đám mây tập trung của bạn, sẽ không mấy ai muốn dùng."**

Đây là comment được like nhiều nhất trong post. Phản ứng của tác giả:
1. "Đã bổ sung lựa chọn cài đặt **cục bộ (local)** không cần và không phụ thuộc Cloud vendor (v1.6), sẽ đơn giản hơn với các bạn không quá rành công nghệ."
2. "AncestorTree hiện đã có bản **Local & Desktop — chạy trực tiếp trên máy tính, không cần server hay Internet.** Phù hợp cho các dòng họ muốn tự quản lý gia phả ngay tại nhà thờ họ hoặc máy cá nhân."

→ **Dự án mạnh nhất về mặt tài liệu/quy trình trong 5 link đã BỊ ÉP pivot sang local-first bởi chính người dùng.** Đây là bằng chứng thị trường trực tiếp nhất cho vision đã khoá của ta. Ta start ở đúng vị trí họ phải chạy tới.

## Khác
- Comment về khó quản lý codebase lớn khi vibe code, chưa có phương pháp add use case liên tục → lý do ta cần docs + codegraph tử tế.
- Tác giả định mở rộng cùng approach sang: số hoá hội đồng hương, quản lý chùa/nhà thờ họ, quỹ khuyến học địa phương, di sản văn hoá cộng đồng.
