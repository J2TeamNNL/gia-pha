# FB Link 5 — KinTree launch post (Nguyễn Anh Nhân, J2TEAM, 14/02)
URL: https://www.facebook.com/share/p/1GNF8rsR9g/
Traction: 598 reactions · **189 comments** · 68 shares (post nhiều feedback kỹ thuật nhất về app)

## Insight pitch của họ (đáng học cách nói)
> "Thời xưa bố mẹ nhớ tới cả những người họ hàng 7-8 đời, thời nay khéo **anh em họ hàng cùng ông nội gặp nhau cũng chưa biết là ai**."
> "Chỉ cần nhìn vào là có thể biết **nên xưng hô như thế nào** với một người bất kỳ."

## Feature bổ sung (so với link 4)
- **Trợ lý AI trả lời câu hỏi về cây gia phả + hỗ trợ thêm mối quan hệ.**
- Tự động phân cấp đời; đặt góc nhìn ở một người bất kỳ.
- **Quy tắc thân tộc theo hôn nhân**: *"khi lấy vợ thì nhà vợ có em dù có hơn tuổi chồng cũng sẽ vẫn là em vợ"* → vai vế bên vợ/chồng tính theo VỊ TRÍ của người phối ngẫu, không theo tuổi.
- Nhập / xuất / chia sẻ dữ liệu (có export JSON).
- **DB: "Mình dùng object storage làm database bạn =)) hơi tricky tí"** → cũng là mô hình 1 file blob như ta.

## 🔴 PHÁT HIỆN QUAN TRỌNG NHẤT — thuật toán vai vế
Minh Trung (feedback sắc nhất cả 5 post):
> *"Hiện còn vụ vai vế trong nhà chưa ổn, app đang so theo TUỔI trong khi thực tế tính theo VAI CỦA BA MẸ. Ví dụ app đang để con gái của dì là **chị** vì lớn tuổi hơn mình, nhưng thực tế thì mình lớn hơn do dì là **em** của mẹ."*
> Case cụ thể: mẹ SN 1948, dì SN 1953 → con của dì phải là **em họ**, không phải chị họ.

Tác giả phản bác "nó có so theo vai vế rồi mà bạn" — **SAI**, app vẫn dùng tuổi.

→ **Quy tắc đúng cho ta: vai vế anh/chị/em họ = ĐỆ QUY theo vai vế của cha/mẹ tương ứng, KHÔNG theo năm sinh cá nhân. Chỉ dùng năm sinh khi hai người là ruột cùng cha mẹ (hoặc khi vai cha mẹ bằng nhau).**

Kèm theo: *"trên 2 đời thì chịu thua vụ năm sinh… tìm được người nhớ năm sinh anh/chị/em của ông bà nội ngoại chua lắm"*
→ **năm sinh THƯỜNG THIẾU ở các đời trên. Bắt buộc có field `birth_order` (thứ tự con: cả/thứ 2/thứ 3/út) nhập tay, độc lập với năm sinh.** Tác giả tự thừa nhận: "nếu không biết năm sinh thì hoặc phải tự định ra, hoặc không phân biệt được".

## Bug người dùng báo (đọc như checklist test cho canvas của ta)
1. **Crash ở ~10 người** ("tạo được 10 người thì lỗi thoát app"); cây tác giả 50 node thì ổn → không reproduce được, không có telemetry.
2. **Thêm BÀ nội / BÀ cố → cây biến mất, các nhánh nhỏ mất; xoá 2 bà đi thì nhánh hiện lại.** Báo nhiều lần. → lỗi layout ở nhánh phối ngẫu nữ.
3. **Anh/chị/em của bố mẹ (cô dì chú bác) không hiển thị trên cây**, chỉ thấy trong tab quan hệ.
4. **Xây lên trên (thêm tổ tiên) thì đời dưới (chính mình) bị mất.**
5. **Thêm thành viên không hiện ngay, phải tắt app mở lại** → không reactive.
6. Đặt góc nhìn ở người có phả hệ ngoài cây chính → **"cây gia phả bay luôn"**, phải bấm nút reset ở góc dưới phải. UX bế tắc.
7. Font quá nhỏ; tên bị rút gọn (sau đó thêm option hiện full tên).
8. Không quay ngang màn hình được (tác giả: "hơi căng").
9. Treo app trên iPhone 13 Pro iOS 16.1 và iPhone 16 Pro iOS 26.0.1.
10. Thẻ nhập quan hệ nhập lần đầu xong không tắt được.

## Feature bị đòi mà CHƯA có
- **Import GEDCOM (.ged)** — hỏi, chưa hỗ trợ.
- **Export PDF / ảnh để in**, kèm năm sinh khi in — hỏi, không thấy trả lời.
- **Bố/mẹ nuôi** — tác giả: *"nó gọi là cực khó, nhưng để mình xem"*.
- **Sắp xếp con cả → con thứ → con út từ trái sang phải** — đòi nhiều lần, tác giả chỉ dựa trên tuổi.
- Người đã mất: *"nên hiển thị NGÀY GIỖ chứ không cần năm sinh năm mất"*.
- **Chuỗi kế thừa cho lý lịch**: "bố đẻ của ông ngoại, mẹ đẻ của bà nội" — use case xét lý lịch/hồ sơ.
- **Hôn nhân cận huyết (họ hàng lấy nhau)** — tác giả né: "gia phả không ai dám đưa lên"; rồi "theo mình biết thì người vợ sẽ bị tách khỏi gia đình, còn xử lý thế nào thì mình cũng chưa nghĩ tới". → bài toán mở, chưa ai giải.
- Bản web (đòi nhiều).

## Kinh doanh & rào cản chuyển đổi
- Có gói **lifetime** ("xin code premium life time"; "muốn đăng ký dùng trọn đời mà lăn tăn, **thấy Android chưa mượt lắm**") → **chất lượng Android đang chặn conversion**.
- "Đăng ký gói trả phí thì mới chia sẻ cho người nhà nhập cùng được phải không?" → **chia sẻ/cộng tác bị khoá sau paywall**.
- Tác giả nói "Free vẫn full tính năng" — mâu thuẫn với việc backup + bài viết + sự kiện là premium.
- **Cộng tác là bản chất của gia phả**: *"có share cho người khác or add người khác vào viết tiếp câu chuyện không bác? Chứ gia phả được 1 mình mình thì không hẳn gia phả lắm."*

## Đối thủ khác được nêu tên
MyFamilyTree (1 user nói "tốt hơn app của bác") · Mac Family Tree (dùng crack) · treefamily · Family Tree 11. Nhiều nhóm đồ án tốt nghiệp FPT University làm đề tài này.

## Privacy
"Mình muốn data người dùng app của bạn" → "lấy được cây gia phả rồi làm gì nữa bạn, mình hỏi giùm **chú hàng xóm áo xanh**" (4 like). Nỗi lo bị thu thập dữ liệu dòng họ là có thật.

## Chất lượng phản hồi tiêu cực đáng lưu
> "Quá nhiều lỗi không dùng được ấy. Viết miễn phí nhưng **giá thì quá đắt**." / "bạn phát triển phần mềm xong không test à. mỗi cái nhập chữ đã thấy lỗi rồi."
→ User VN không khoan nhượng với app gia phả có phí mà lỗi. Chất lượng > tính năng.
