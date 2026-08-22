# FB Link 1 — Gia Phả Điện Tử (Lê Huy Đức Anh, 22/02)
URL: https://www.facebook.com/share/p/1HbPrs3i7P/
Traction: 1.1K reactions · 124 comments · 436 shares
Repo: github.com/0xAstroAlpha/Gia-Pha-Dien-Tu · Demo: gia-pha-demo.vercel.app/tree
Stack: Supabase + Vercel (chi phí 0đ), build bằng Antigravity. Scale thực: 15 đời, 300+ người, max ~1000.

## Feature set họ ship
- Cây toàn cảnh 1 trang, zoom/pan tự do, **3 chế độ xem: toàn cảnh / tổ tiên / hậu duệ**
- **Nhánh lớn auto thu gọn, click mở dần** (giải pháp cho tree lớn)
- Tìm kiếm theo tên
- Editor trực quan trên cây: sửa tên, năm sinh/mất, đổi cha, sắp thứ tự con
- **Tự động tạo sách gia phả in được** (export)
- Danh bạ dòng họ: SĐT, email, Zalo, Facebook
- Lịch sự kiện: giỗ tổ, hội họp, lễ tết (đang làm)
- Thư viện ảnh/video — **BLOCKED vì không có CDN**
- Phân quyền admin/member (member đề xuất → admin duyệt), audit log, backup

## Pain points từ comments (xếp theo mức độ đồng thuận)
1. **Đa thê — HOT nhất.** "1 ông lấy 2 bà thể hiện rõ ràng không" (12 like). Tác giả thừa nhận *"chưa lường trước được"*. Follow-up: "hai còn ít, cả 3,4 cơ"; "con của ông đó với bà nào"; "ông mình và ông vợ mình đều tái hôn với bà 2". → tái hôn sau khi vợ mất, con thuộc bà nào.
2. **Tính danh xưng/xưng hô giữa 2 người bất kỳ — comment TOP 58 like.** Tác giả gạt đi ("không phải usecase thường dùng"), bị phản biện ngay: *"usecase thường dùng chứ, họ đông không biết ai gọi ai là gì"*. → KILLER FEATURE, tác giả bỏ lỡ.
3. **Con đẻ vs con rể/con dâu** — cần quy tắc phân biệt rõ. Giải pháp của họ: gắn nhãn "ngoại tộc".
4. **Export/in ấn**: in sơ đồ rất khó, max 4–5 đời/tờ. Giải pháp của họ: export dạng **văn bản readable** thay vì sơ đồ. Lưu ý văn hoá: *"kiêng để mặt người lên"* bản in.
5. **Định vị mộ + ảnh mộ** (lưu location người/mộ, ảnh tương ứng).
6. Tách giao diện admin vs giao diện người dùng cuối.
7. **Responsive mobile** — bị đòi.
8. Lưu ảnh/video = bài toán CDN chưa giải.
9. Search phải đưa lên top.
10. **"Web dạng này tần suất truy cập ít nhưng yêu cầu sự TRANG NGHIÊM nhiều hơn"** → định hướng thiết kế.
11. **Friction triển khai**: "không rành triển khai cấu hình sử dụng, anh làm video hướng dẫn không" → user thường KHÔNG tự setup được Supabase/Vercel.
12. Giới tính từng node (hỏi, chưa rõ có chưa).

## Ideas mới từ comments
- Arweave — lưu trữ vĩnh viễn.
- **Check chéo giữa các gia phả** → "big data biết đâu nhận được họ hàng".
- **CLI/skill/chatbot để AI agent tra cứu gia phả** ("skill luôn").
- Tác giả làm thêm news feed social để post event; vẫn phải kết hợp Group FB/Zalo để thảo luận.

## Signal thị trường
- Mùa vụ: **cầu bùng nổ dịp Tết** ("Tết nhất về, họ hàng xa không nhớ xưng hô, và dạy cho con").
- "Trong hội vibe code thấy các ấy làm từ trước Tết đến giờ" → nhiều người cùng làm, thị trường đông.
- Đối thủ trả phí: **"vừa mua app mobile Family Tree 11 xong, xài như cùi, không đúng ý tí nào"** → app quốc tế trả phí không fit user VN.

## Đối chiếu dự án ta
- LỢI THẾ: zero-setup (PWA, không cần Supabase/Vercel) · Google Drive/Photos giải bài toán CDN miễn phí · đã plan danh xưng + đa thê + con rể/dâu từ đầu · privacy-first.
- THIẾU so với họ: 3 chế độ xem, auto-collapse nhánh lớn, search, export sách in được, danh bạ, lịch sự kiện, phân quyền/audit.
