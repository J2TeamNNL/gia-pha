# Bức tranh cạnh tranh

> **Kiểm chứng lần cuối: 2026-08-22.** Tài liệu này mục theo thời gian — site đổi, app ship bản mới. Trước khi dựa vào nó để quyết định, xem lại ngày trên.
> Bằng chứng: `plans/reports/fb-research/` (~700 comment thật, 5 post) · `plans/reports/web-recon-260821-2312-competitor-web-demos.md` (đo trực tiếp 4 site) · `plans/reports/kintree-recon-260821-2312-android-teardown.md` (26 màn hình).

## Bảng đối thủ

| Dự án | Stack | Còn sống? | Giải được gì | Sai / thiếu chỗ nào |
|---|---|---|---|---|
| **Gia-Pha-Dien-Tu** (Lê Huy Đức Anh) · 1.1K react · 124 cmt · 436 share | Supabase + Vercel | Demo còn chạy | 3 chế độ xem (toàn cảnh/tổ tiên/hậu duệ) · nhánh lớn auto thu gọn · editor trên cây · sinh sách gia phả in được · danh bạ · phân quyền + audit log | **Không có đa thê** (tác giả: *"chưa lường trước được"*) · **gạt bỏ xưng hô** rồi bị phản biện · demo public chỉ **15 người / 4 đời** (quảng cáo 15 đời / 300+) · `/people` `/directory` `/events` **rỗng** · search **không fold dấu** · auto-fit mở ở `scale(0.12)` → canvas trắng · mobile: `<main>` còn **119 px** ở 375 px |
| **giapha-os** (Charlie Minh) · 1.1K react · **211 cmt** · 229 share | Supabase + Vercel | Repo còn, demo phụ thuộc Supabase của từng người | Có đa thê (*"cụ nhà em cũng 2 bà"*) · phân quyền member/admin · đã thêm **GEDCOM + CSV** sau khi bị đòi | Bị mổ công khai (27 like): **N+1 query · thiếu index → full table scan · chia field ngày quá nhiều** · bug **cháu dâu sai** dù con dâu đúng · **xưng hô bó tay** (*"em chưa nghĩ ra cách giải quyết"*) · lưu ngày giỗ theo **dương lịch** — user nói thẳng là sai · **Supabase khoá project sau 7 ngày** không dùng · rất nhiều user không đăng ký / không cài được |
| **AncestorTree** (Dang The Tai) · 1K react · 22 cmt · **321 share** | Next.js 16 + React 19 + Supabase + Vercel, MIT | `/tree` **hard-redirect sang login** | Tài liệu tốt nhất trong 5 dự án (9 doc SDLC, 77 FR + 17 NFR) · nhiều feature VN ta chưa nghĩ tới: **tự tính chi/nhánh/đời · chính tộc/ngoại tộc · vinh danh & quỹ khuyến học · hương ước · "cầu đường" phân công lễ tộc** | **Bị chính user ép pivot**: comment top 23 like *"lưu dữ liệu gia phả trên đám mây tập trung của bạn thì không mấy ai muốn dùng"* → tác giả phải ra bản **Local & Desktop** · không xem được cây mà không có tài khoản |
| **KinTree** (Nguyễn Anh Nhân) · iOS + Android, **app trả phí duy nhất trên store** | Expo SDK 54 / React Native / Hermes, object storage làm DB | Đang bán | **Xưng hô theo góc nhìn một người** (duy nhất có) · lịch vạn niên · **76 bài văn khấn + chế độ tự đọc** · mộ phần · ngày cưới · đổi font + cỡ chữ · export JSON · **trợ lý AI** · **không bắt đăng ký** — dùng local đầy đủ | **Xưng hô dùng TUỔI nên sai** (user chứng minh: con của dì bị gọi là chị họ) · **không có thứ tự con tường minh** · **không phân loại nhận nuôi / con dâu-rể** · **không có cấu hình vùng miền** · đa thê **vẫn lỗi** khi gán con cho bà thứ 2 · **crash ở ~10 người** (1 báo cáo) · thêm bà nội/bà cố → nhánh biến mất · cô dì chú bác không hiện trên cây · thêm người phải tắt app mở lại · không GEDCOM · không export PDF/ảnh · **bố/mẹ nuôi**: *"cực khó"*, chưa làm · **collaboration hỏng trên Android** (hỏi 3 lần không được trả lời) |
| **hyhon.io.vn** "Sakura Family Tree" | VPS | ☠️ **CHẾT** | — | Tác giả: *"vps em hết hạn nên em gỡ rồi"*. Domain giờ là **CV cá nhân của tác giả** |
| **giaphax.io.vn** (Minh Nguyễn) | Supabase | ☠️ **BACKEND CHẾT** | Dự án **duy nhất** có model đa thê: `spouseIds[]`, `second_wife`, `concubine`, `Con riêng`, `Con nuôi` | Front-end còn chạy nhưng `POST /api/supabase/query` → **500, tenant not found** (project bị pause/xoá). Model đa thê là **nhãn phẳng** — không trả lời được "con của bà nào" |
| **tocvoquangngai.com/pha-do** | — | Còn chạy | **Gia phả THẬT đang dùng**: 292 người, 5 đời, không login. Nơi **duy nhất** thấy xưng hô chạy đúng: *"Võ Quý **là ông ngoại của** Võ Minh Huy"* | Full view **hỏng**: 231/393 cặp card cùng hàng ở gap 0 · công bố đồ thị quan hệ 292 người đang sống **không auth** (giảm nhẹ: avatar là placeholder, không lộ mặt) · `/gia-pha` **404**, đường đúng là `/pha-do` |
| Quyenld9699/family-tree | Vercel + MongoDB cloud + Cloudinary | Repo còn | Có hỗ trợ đa thê. Quan điểm đáng lưu: *"thông tin nhạy cảm mỗi gia đình một db riêng là hợp lý"* | Chưa đánh giá trực tiếp |
| Family Tree 11 · Mac Family Tree · MyFamilyTree · treefamily | thương mại, quốc tế | Đang bán | — | *"vừa mua app mobile Family Tree 11 xong, xài như cùi, không đúng ý tí nào"* · *"em vẫn đang dùng Mac Family Tree crack"* → **app quốc tế trả phí không fit user VN** |

**Bối cảnh**: *"1 tháng 10 cái app gia phả"* · *"trend gia phả thay thế trend bộ gõ"* · nhiều nhóm đồ án FPT University làm đề tài này. Thị trường **bão hoà tool, chưa ai giải đúng**.

## Nhu cầu chưa ai đáp ứng — xếp hạng

| # | Nhu cầu | Trạng thái ở đối thủ |
|---|---|---|
| 1 | **Đa thê / đa phu render đúng, con thuộc đúng bà** | **Không một site nào render được.** Yêu cầu số 1, lặp lại cả 5 post. App trả phí cũng lỗi |
| 2 | **Xưng hô giữa 2 người bất kỳ, theo góc nhìn, theo vùng miền** | Comment like cao nhất (58). 2 tác giả OSS **bó tay**. KinTree làm nhưng **sai** vì dùng tuổi. 1 site có làm đúng nhưng chỉ nhãn đơn giản |
| 3 | **In ra được**: bảng tông đồ đẹp, PDF/ảnh kèm năm sinh | *"in ra được nhưng em chưa làm được giao diện màu mè"* → người ta phải dùng phần mềm đồ hoạ hoặc Gemini tự làm infographic |
| 4 | **Ngày giỗ đúng: âm lịch làm gốc + tháng nhuận** | giapha-os lưu dương → user nói sai. Không ai xử lý tháng nhuận |
| 5 | **Thứ tự con tường minh** (con cả / thứ / út) | Đòi nhiều lần. Tất cả đều trả lời "dựa trên tuổi" — mà **đời trên thường không có năm sinh** |
| 6 | **Con nuôi / bố mẹ nuôi / con thừa tự** | KinTree: *"cực khó"*, chưa làm. Không ai có |
| 7 | **Quét gia phả giấy (OCR sách cũ)** | *"chưa đủ trình"*. Không ai làm |
| 8 | **Định vị mộ + ảnh mộ** | Chỉ KinTree có field mộ phần |
| 9 | **Hôn nhân cận huyết trong họ** | *"người vợ sẽ bị tách khỏi gia đình… mình cũng chưa nghĩ tới"*. Bài toán mở |
| 10 | **Tránh hôn nhân cận huyết** (10 like) — *"đỡ xảy ra việc cháu yêu cô, chú yêu cháu"* | Không ai làm |
| 11 | Nhận diện mặt → ra tên | Đòi 2 lần. Không ai làm |
| 12 | Lưu ảnh/video cả gia tộc | *"chưa có chỗ lưu CDN"* — bài toán chi phí, không phải kỹ thuật |

## Định vị và wedge của ta

**Bằng chứng mạnh nhất**: **2 trong 4 backend đối thủ đã chết trong ~6 tháng.** Hai site duy nhất còn render được cây chính là **hai site không có backend**. Cộng thêm: Supabase khoá project sau 7 ngày không dùng; hàng loạt user không tự cài nổi.

**Wedge trực tiếp**: KinTree — app trả phí duy nhất trên store — thu phí cho **cloud sync · hosting ảnh vĩnh viễn · LLM · social feed · giới hạn 5 tài khoản**. Tác giả nói thẳng: *"pro với bình thường chả khác gì nhau đâu, **chỉ khác cái lưu trữ đám mây**"*. **3 trong 4 thứ đó ta cho không được** bằng Drive/Photos của chính user.

Định vị mượn được từ AncestorTree (họ diễn đạt rất tốt): *MyHeritage và FamilySearch hoạt động tốt ở phương Tây nhưng **không hiểu cấu trúc gia tộc Việt**: âm lịch, ngày giỗ, chi–nhánh–đời, can chi.*
→ Nhưng **không trích con số** "54 họ lớn / 10.000 hội đồng gia tộc" của họ — không có nguồn.

## Rủi ro thị trường — phản biện của codex, chưa được phản bác

> Engagement Facebook trong group dev **không phải** nhu cầu sản phẩm bền. *"1 tháng 10 app gia phả"* đọc theo cách khắc nghiệt = **dễ demo, khó duy trì**. Nhu cầu cực mùa vụ, tần suất dùng cả năm cực thấp, user mong lưu trữ trọn đời nhưng tạo rất ít doanh thu định kỳ.
>
> **Đối thủ thật không phải KinTree — mà là người giữ gia phả trong họ + tờ giấy + file Word + group Zalo.** Mọi dòng họ đã có sẵn phương án thay thế, và chuyển sang phần mềm đòi phải nhập dữ liệu nhạy cảm của hàng trăm người **trước khi** thấy được giá trị.
>
> Moat thật là **cam kết lưu trữ dài hạn + quyền sở hữu dữ liệu mang đi được** — không phải số tính năng, AI, hay canvas đẹp.
>
> Và: local-first giảm rủi ro server nhưng làm khó chuyện **ai có quyền quyết định** và **kế thừa khi người giữ mất**. **Dev solo cũng là một rủi ro lưu trữ**: app có thể biến mất trước gia phả rất lâu.

Nguồn: `plans/reports/fb-research/codex-cross-review.md` §7.
