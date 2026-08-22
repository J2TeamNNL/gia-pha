# KinTree teardown — trạng thái đã đăng nhập

Ngày đo: 2026-08-22 19:33–19:42 · Thiết bị: Xiaomi 14 (`houji_global`, 23127PN0CG), Android, 1200×2670 @480dpi
App: `dev.creaton.kintree` **v1.0.5** (versionCode 67954477, minSdk 24, targetSdk 36), cài 2026-08-21 22:48
Cách đo: wireless ADB + `uiautomator dump` + screencap. Tài khoản của chính chủ máy, dữ liệu trong cây là dữ liệu test (Ong/Ba/Cha/Me/Vo).

**[đo]** = thấy trực tiếp trên máy · **[suy]** = suy luận

---

## 1. Điều hướng

5 tab đáy: **Bảng tin** · Gia phả · Lịch · **Văn Khấn** · Thêm.

**[đo]** Tab mặc định khi mở app là **Bảng tin** (feed xã hội: "Bạn đang nghĩ gì?", Ảnh, Sự kiện), **không phải cây**. Cây là tab thứ hai.

**[suy]** Họ định vị sản phẩm là mạng xã hội gia đình có kèm gia phả, không phải công cụ gia phả. Điều này giải thích vì sao họ đầu tư vào Văn Khấn và Lịch.

## 2. Mô hình người — 8 field, tên là MỘT chuỗi

**[đo]** Toàn bộ field của một người:

| Field | Ghi chú |
|---|---|
| HỌ VÀ TÊN | **một ô duy nhất** |
| GIỚI TÍNH | Nam / Nữ |
| NGÀY SINH | |
| TRẠNG THÁI | Còn sống / Đã mất |
| ĐỊA CHỈ | |
| SỐ ĐIỆN THOẠI | |
| NƠI LÀM VIỆC | |
| GHI CHÚ | |

Khi đặt TRẠNG THÁI = **Đã mất**, hiện thêm 2 field: **NGÀY MẤT** và **ĐỊA ĐIỂM AN TÁNG**.
(NƠI LÀM VIỆC / GHI CHÚ biến khỏi vùng thấy được — chưa xác nhận là bị ẩn hay chỉ trôi khỏi màn.)

**Xác nhận [`docs/culture-vietnam.md`](../../docs/culture-vietnam.md) §1.1:** KinTree lưu tên như một chuỗi.
Hệ quả: không biểu diễn nổi `Bà Võ Văn Mượng` (vợ ghi bằng tên chồng, không có tên riêng), và tên đệm nhiều âm
("Nguyễn **Thị Thu** Hà") hay họ ghép ("**Nguyễn Phúc**") phải parse mới ra — tức là sẽ sai.

**Không có:** thứ tự con (`culture-vietnam.md` §4 nói phải nhập tay được), không có trường phân biệt ngày giỗ với ngày mất.

## 3. Âm lịch — CÓ, nhưng KHÔNG có tháng nhuận

Đây là phát hiện quan trọng nhất, và nó **sửa lại một giả định của dự án**.

**[đo]** Picker ngày có toggle **Dương lịch / Âm lịch** và nút **Nhập tay**. Nên khẳng định "đối thủ không có âm lịch" là **sai** — họ có.

**[đo]** Nhưng ở tab Âm lịch, wheel THÁNG chạy **Th1 → Th12 rồi dừng**. Không có mục thứ 13, không có nhãn "nhuận",
và `uiautomator dump` không tìm thấy chuỗi `nhuận`/`leap` nào trong UI.

**Kiểm chéo bằng `src/lib/lunar-calendar.ts` của chính dự án này:**

```
âm lịch 1990: tháng nhuận = tháng 5     ← năm đang chọn trên máy
âm lịch 2020: tháng nhuận = tháng 4
âm lịch 2023: tháng nhuận = tháng 2
âm lịch 2025: tháng nhuận = tháng 6
âm lịch 2026: KHÔNG có tháng nhuận
```

Năm âm 1990 **có** tháng 5 nhuận, mà KinTree chỉ cho chọn "tháng 5". Hai tháng đó là **hai tháng khác nhau**.
⇒ Một giỗ rơi vào tháng nhuận **không ghi đúng được** trong KinTree, và sẽ lệch ngày ở mọi năm có tháng nhuận.

Đây đúng là khoảng trống migration v6 (`is_leap_month`) của dự án lấp. **Differentiator có thật, đã kiểm chứng trên bản đang phát hành.**

## 4. Cây — họ dùng "Đời N" tuyệt đối

**[đo]** Mỗi thẻ hiện: ký hiệu **♂/♀**, **"Đời 1/2/3"** (số đời tuyệt đối của dòng họ), tên, và **xưng hô tính sẵn in đỏ**
("Ông nội", "Bà nội", "Cha", "Vợ"). Người trung tâm không có chữ đỏ.

**Họ CÓ tính xưng hô.** Không phải "đối thủ không làm được" — họ làm.

**[đo]** Menu khi bấm một người: Thêm quan hệ · Xem chi tiết · Xem cây của X · Xem quan hệ của X · **Đặt người này làm trung tâm**.
Trong trang chi tiết có 3 tab: Thông tin · Cây · Quan hệ.

**[đo]** Điều khiển nổi: người / zoom+ / zoom− / reset. Khung thẻ có hoạ tiết góc kiểu truyền thống.

**Đáng cân nhắc:** "Đời thứ mấy" là khái niệm gia phả Việt thật. Dự án này hiện chỉ có **vai vế tương đối** (`+1`/`−1`)
trong danh sách họ hàng, chưa có số đời tuyệt đối. **Chưa kiểm** họ tính "Đời 1" từ đâu khi cây có nhiều gốc (forest).

**Chưa kiểm:** ca `con dâu` / `cháu dâu` — invariant #4 của dự án nói lưu thành nhãn chính là nguyên nhân bug
"con dâu đúng mà cháu dâu sai". Muốn kiểm phải **thêm người**, tức là ghi dữ liệu lên server họ. Chưa làm.

## 5. Dữ liệu — export/import miễn phí, SYNC mới thu phí

**[đo]** Màn `Thêm → Dữ liệu`:

| Chức năng | Trạng thái |
|---|---|
| **Xuất dữ liệu** ("Xuất dữ liệu cây gia phả") | **miễn phí** |
| **Nhập dữ liệu** ("Nhập dữ liệu cây gia phả từ tệp") | **miễn phí** |
| **Đồng bộ dữ liệu** | **PRO** — "Cần nâng cấp Premium" |
| Đặt lại cây ("Xoá toàn bộ dữ liệu và bắt đầu lại") | miễn phí |

**[đo]** Bấm Xuất dữ liệu → sinh file ngay, không hỏi định dạng, mở share sheet Android với tên:
`kintree-export-2026-08-22T12-39-54.json`

⇒ Định dạng export là **JSON**, **không phải GEDCOM**.

**Hai hệ quả cho dự án:**

1. **Vị thế của ta đang tệ hơn bản miễn phí của họ.** KinTree free đã cho xuất và nhập file. Dự án này
   **chưa có đường nào lấy dữ liệu ra** (worker protocol không có request đọc bytes DB) — xem
   [`decisions.md`](../../docs/decisions.md) mục "Câu chưa trả lời được" #3. Đây không còn là "thiếu tính năng
   hay có", nó là thua ở mức cơ bản.
2. **Parser GEDCOM 849 dòng đang nằm không sẽ KHÔNG đọc được file KinTree.** Muốn có đường nhập từ KinTree
   phải viết adapter JSON riêng. Chưa biết schema JSON của họ ra sao.

**[suy]** Monetization của họ là **sync đa thiết bị**, không phải khoá dữ liệu. Hợp lý và tử tế hơn nhiều đối thủ.

## 6. Văn Khấn — mảng nội dung ta không có gì tương đương

**[đo]** **76 bài** văn khấn, có ô tìm kiếm, phân loại ("Tín ngưỡng - Lễ hội", "Tất cả"), mỗi bài kèm metadata dịp:

- "Dâng sao giải hạn • Ngày Rằm tháng Giêng" / "• Ngày 15 hàng tháng" / "• Ngày mồng 8 hàng tháng"
- "Cầu tự • Ngày lành tháng tốt"
- Văn khấn giải hạn theo từng sao: Thái Bạch, Thái Âm, La Hầu, Kế Đô, Mộc Đức
- "Văn khấn ban Công Đồng (Tứ Phủ)", "Tết Trung Nguyên"

**[suy]** Đây là lý do người dùng mở app khi **không** đang nhập gia phả. Nhập gia phả là việc làm vài lần rồi thôi;
văn khấn là việc tra hàng tháng. Nó giữ retention, và giải thích vì sao feed được đặt làm tab mặc định.

## 7. Lỗi nhỏ ghi nhận

**[đo]** Dialog chọn Trạng thái có tiêu đề **"Select Option"** — chưa dịch, tiếng Anh lọt vào app Việt.
(App có split APK riêng cho `vi` và `en`: `split_config.vi.apk`, `split_config.en.apk`.)

## 8. Cập nhật lại các khẳng định cũ của dự án

| Khẳng định cũ | Sau khi đo |
|---|---|
| Tên lưu thành một chuỗi nên sai | **ĐÚNG**, xác nhận trực tiếp |
| Đối thủ chưa làm xưng hô | **SAI** — KinTree có, in ngay trên thẻ |
| Âm lịch là differentiator | **Chỉ đúng phần tháng nhuận.** Âm lịch họ có; tháng nhuận thì không |
| Đối thủ không có export | **SAI** — export + import miễn phí; ta mới là bên không có |

## Câu chưa trả lời được

1. Schema JSON trong file export của họ — chưa mở. File chứa dữ liệu gia đình của chủ máy nên cần chủ máy đồng ý trước.
2. Ca `con dâu` / `cháu dâu` (invariant #4) — cần thêm người vào cây, tức ghi lên server họ. Chưa làm.
3. "Đời 1" được tính từ gốc nào khi cây có nhiều component rời.
4. Tab **Lịch** chưa xem — nghi là lịch âm + nhắc giỗ, nếu đúng thì đó là mảng thứ hai ta không có.
5. NƠI LÀM VIỆC / GHI CHÚ có thật sự bị ẩn khi chuyển sang "Đã mất", hay chỉ trôi khỏi vùng thấy.
