# FB Link 4 — KinTree (Nguyễn Anh Nhân, 16/02) — CHÍNH LÀ APP ANDROID ĐANG TEST
URL: https://www.facebook.com/share/p/1HZK72B1eU/
Traction: 111 reactions · 49 comments · 13 shares (thấp hơn hẳn các post OSS → app store không lan bằng open source)
iOS: apps.apple.com/.../kintree-family-tree/id6758687235 · Android: play.google.com (`dev.creaton.kintree`)
Định vị: "Trang bị đầy đủ sẵn sàng đi ăn cỗ, ăn tết. Vô cùng phù hợp cho các anh em **tương lai trưởng họ**."

## Feature set (theo tác giả)
- Cây gia phả đủ **trực hệ lẫn phả hệ** — *"không sợ các cụ đa thê"*
- Thêm nhánh mới / quan hệ mới dễ dàng
- **Góc nhìn từ 1 cá nhân để phân biệt cách xưng hô** với mọi vị trí khác trong cây — tác giả tự nhận *"chưa đầy đủ lắm, cần phân biệt theo vùng miền nữa"*. Cơ chế: **dựa trên tuổi (năm sinh)** để ra bác vs chú.
- **Lịch vạn niên** — ngày xấu/tốt, ngày lễ
- **Lịch gia đình** — ngày sinh, ngày mất, sự kiện, kỷ niệm, đủ âm/dương
- Thông tin cá nhân đầy đủ: trạng thái, **ngày cưới**, ngày sinh/mất, **mộ phần**
- **76 bài văn khấn** phổ biến, cho tuỳ chỉnh nội dung, **có chế độ tự động chạy để đọc văn khấn** (teleprompter)
- Theme sáng/tối, **đổi phông chữ + kích thước chữ** (accessibility cho người cao tuổi)
- Thêm sự kiện vào lịch → nhận thông báo
- **Xuất file JSON** (tác giả xin user "xuất file json gửi inbox" để debug)

## MÔ HÌNH KINH DOANH (lấy từ comments — đây là data đáng giá nhất)
- **1 người trả phí cho cả gia đình** ("1 người trả phí thôi nhé bạn").
- **Premium = backup dữ liệu lên đám mây + thêm bài viết + thêm sự kiện.**
- **Gia phả core thì KHÔNG cần đăng ký cũng dùng bình thường.**
- Tác giả nói thẳng: *"pro với bình thường chả khác gì nhau đâu anh ơi, **chỉ khác cái lưu trữ đám mây**"*.
→ **Kết luận: đối thủ trả phí duy nhất trên store đang bán CHÍNH XÁC cái mà ta cho miễn phí** (đồng bộ Google Drive của chính user). Đây là wedge cạnh tranh rõ ràng nhất.
→ Cũng nghĩa là: cloud backup CÓ willingness-to-pay thật ở thị trường VN.

## Bug / hạn chế người dùng phản ánh
1. **Đa thê VẪN LỖI dù là app trả phí**: *"ông em có 3 bà. Em thử tích con của bà 1 thì oke rồi xong tích của bà 2 nó hiện ra như ảnh"* → gán con cho từng bà bị sai. Tác giả phải xin file JSON để debug, user không gửi được.
2. **Collaboration hỏng trên Android**: user hỏi **3 lần** "Android có thêm người cùng chỉnh sửa vào được không, mình không thấy nút" → không được trả lời. Tác giả nói "cứ add vào gia đình là họ cùng sửa được" nhưng UI Android không có.
3. **Bỏ tính năng thêm anh/chị em trực tiếp**: user hỏi sao phải add qua bố/mẹ. Tác giả: *"ban đầu là đúng như bạn nói đó, nhưng xử lý nó không hợp lý thành ra mình bỏ cái trường hợp đó đi rồi"*.
   → **Cảnh báo cho ta: dự án ta CÓ nút thêm Anh/Chị/Em trực tiếp. Phải xử lý đúng case "anh chị em khi chưa có cha/mẹ" (tạo cha/mẹ ẩn/placeholder), nếu không sẽ gặp đúng bế tắc buộc họ phải cắt tính năng.**
4. Xưng hô dựa trên năm sinh → sai khi thiếu năm sinh, và không xử lý vùng miền. Comment: "khó vì do vùng miền ngôn ngữ khác nhau".
5. Pop-up không tắt được (đã fix).
6. "Hình như chưa được hoàn thiện lắm... tích xong giờ không biết bỏ kiểu gì" → không undo được thao tác tích chọn.

## Ideas nên mượn
- **76 bài văn khấn + chế độ auto-scroll để đọc** — nội dung văn hoá, offline-friendly, zero infra. Rất fit local-first.
- **Lịch vạn niên + ngày tốt/xấu** — tính toán được hoàn toàn client-side.
- **Ngày cưới + mộ phần** là field ta còn thiếu.
- **Đổi phông chữ + kích thước chữ** — người dùng chính của gia phả là người cao tuổi. Ta chưa có.
- Định vị "dành cho **tương lai trưởng họ**" — persona rất sắc, đáng học cách nói.
