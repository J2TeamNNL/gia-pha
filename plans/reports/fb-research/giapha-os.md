# FB Link 2 — giapha-os (Charlie Minh, J2TEAM Community, 23/02)
URL: https://www.facebook.com/share/p/1BkGnwMLwZ/
Traction: 1.1K reactions · **211 comments** · 229 shares
Repo: github.com/homielab/giapha-os · Stack: Supabase + Vercel. Schema public: docs/schema.sql

## Đối thủ / dự án khác lộ ra trong comments
| Dự án | Ghi chú |
|---|---|
| hyhon.io.vn "Sakura Family Tree" | **ĐÃ GỠ — "vps em hết hạn nên em gỡ rồi"** → hosting cost giết dự án |
| giaphax.io.vn | Minh Nguyễn |
| github.com/Quyenld9699/family-tree | **có hỗ trợ đa thê**; Vercel + MongoDB cloud + Cloudinary; "mỗi gia đình một db riêng là hợp lý" |
| tocvoquangngai.com/gia-pha | gia phả tộc Võ, khách hàng thật |
| Family Tree 11 (mobile, trả phí) | user mua rồi: "xài như cùi, không đúng ý tí nào" |
| — | "1 tháng 10 cái app gia phả", "trend gia phả thay thế trend bộ gõ" → thị trường bão hoà tool, **chưa ai giải đúng** |

## Pain points (xếp theo consensus)
1. **Đa thê + đa phu — lặp lại #1.** "1 người nhiều vợ (cùng lúc HOẶC bà này mất lấy thêm bà khác) và các con ghi rõ con của bà nào". Cả đa phu (1 vợ nhiều chồng) cũng bị hỏi. Tác giả: định lấy gốc là người mẹ nhưng "đa phu thì khá rối". Comment: *"1 ông bố 4 bà vợ, mỗi bà 2 con, rồi vẽ sơ đồ, xuất ra cho dễ nhìn là thấy ngán"*.
2. **Xưng hô — lặp lại, tác giả BÓ TAY.** "bấm vào góc nhìn người A thì biết xưng hô với người B là chú hay cậu" → tác giả: *"phức tạp quá em chưa nghĩ ra được hướng giải quyết"*. Bổ sung quan trọng:
   - **Xưng hô khác nhau theo từng MIỀN** (Bắc/Trung/Nam: cô/dì/bác/chú/mợ/cậu) → cần cấu hình vùng.
   - **Xưng hô phụ thuộc NGƯỜI XEM** → phải tính viewer-relative, không phải nhãn tĩnh.
   - Gợi ý: thêm mã thứ tự đời/nhánh (a2, a3, c4) để tự nhận dạng.
3. **NGÀY GIỖ PHẢI LÀ ÂM LỊCH LÀM GỐC.** Feedback thẳng: *"chỗ ngày mất bạn mặc định để đó là ngày AL xong nếu có đổi sang DL. Chứ nhập vào lại là ngày DL thì không đúng. Vì cúng giỗ tính ngày âm."* Tác giả lưu dương rồi convert → user nói SAI. → **quyết định thiết kế cho ta: ngày giỗ lưu âm lịch là nguồn chân lý, dương lịch là dẫn xuất.**
4. **Layout bug — trực tiếp áp cho canvas của ta:** *"Cây bị lệch giữa các thế hệ tương đồng khi nhánh đơn (1 con) sẽ ngắn hơn nhánh đa (2 con trở lên). Tên dài/ngắn cũng ảnh hưởng hiển thị ngang hàng."* → hàng thế hệ phải align tuyệt đối, độc lập với kích thước subtree và độ dài tên.
5. **Hiển thị người đã mất**: avatar nhạt không đủ, nữ càng khó nhận. Đề xuất ký hiệu nhỏ (gạch chéo góc) hoặc chỉ hiện năm mất. Tác giả lo *"giao diện hơi bị đau lòng đặc biệt nếu gia đình có người trẻ mất"* → cần marker **trang nghiêm, không gợi nỗi đau**.
6. **Con dâu vs con rể phải tách**: "con dâu là nội tộc, rể thì ngoại". Bug thật: "con dâu hiển thị đúng nhưng **cháu dâu thì sai**" → lỗi in-law theo độ sâu.
7. **Auth/backend = điểm chết vận hành.** Rất nhiều comment: không đăng ký được, "bị limit email", "failed to fetch", **"7 ngày không vào nó tự khoá"** (Supabase free tier pause). 1 người clone rồi tự thêm Google login vì *"không phải ai cũng nhớ được pass"*.
8. **Không tự cài được.** "dân ngoại đạo nên mò từng bước", "em mới tập dùng máy tính chưa thạo", "làm video hướng dẫn không", cài trên NAS Synology không xong.
9. **Kiến trúc bị mổ công khai (27 like)** — Phi Phạm: *N+1 query · chia field ngày quá nhiều trong Person model · thiếu index → full table scan · cây chưa hỗ trợ đa thê*.
10. **Privacy = nỗi lo TOP.** "pub web thì lộ hết tên cả gia tộc, rồi lũ trẻ sao dám đi học"; "database có gửi về server không đó"; "cái này mà bảo mật tốt nữa là nhiều người cần lắm"; "mấy cháu đi học nhớ giấu kĩ web gia phả nhá".
11. **Nhập liệu trên điện thoại bất tiện** → workflow đúng: nhập hàng loạt trên desktop, xem/sửa nhỏ trên mobile.
12. Zoom in/out bị đòi. Phân quyền member=chỉ xem / admin=sửa bị đòi nhiều lần.
13. GEDCOM: bị đòi → tác giả đã thêm import/export **gedcom + csv**.
14. Con gái: "gia phả theo huyết thống thường cây con trai dài, con gái đến đời con là không cập nhật vì theo gia phả người khác" → cần policy/toggle phụ hệ.

## Ideas mới (chưa ai làm)
- **Quét gia phả giấy** (OCR sách gia phả cũ) → tác giả "chưa đủ trình". **Cơ hội lớn.**
- **In bảng tông đồ truyền thống** đẹp → tác giả "in ra được nhưng chưa làm được giao diện màu mè". Người ta phải dùng phần mềm đồ hoạ / Gemini làm infographic. → **Export poster thẩm mỹ truyền thống là khoảng trống.**
- **Nhận diện mặt** → chụp ảnh ra tên người (đòi 2 lần).
- **Tránh hôn nhân cận huyết** (10 like): "đỡ xảy ra việc cháu yêu cô, chú yêu cháu do không biết họ hàng" + ý tưởng "add friend → hiện chung họ / nhánh / mấy đời / xưng hô ra sao".
- **Notify cả họ khi có người sinh / mất.**
- Tích hợp VNeID (quét mã ra huyết thống), giấy khai sinh.
- Gộp gia phả toàn VN làm tư liệu lịch sử: "chính sử VN thất lạc nhiều, dựa vào gia phả có thể làm rõ hơn".
- Tử vi, kinh dịch, lịch giỗ, MXH gia tộc. Self-host NAS Synology. Plugin.

## Đối chiếu dự án ta
- **Xác nhận mạnh cho local-first**: hosting hết hạn → mất web; Supabase khoá sau 7 ngày; user không cài nổi; lo data về server. Ta không có backend → miễn nhiễm cả 4.
- **Phải làm đúng ngay**: ngày giỗ gốc âm lịch · align hàng thế hệ · đa thê/đa phu + con thuộc bà nào · xưng hô viewer-relative + theo miền · marker người mất trang nghiêm · con dâu(nội) vs con rể(ngoại) đúng ở mọi độ sâu.
