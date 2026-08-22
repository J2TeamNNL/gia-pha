# Privacy và dữ liệu nhạy cảm

> Kiểm chứng: 2026-08-22. Nguồn: `plans/reports/reviewer-260821-2312-sync-security-pwa.md`, `plans/reports/web-recon-260821-2312-competitor-web-demos.md`.

## 1. Hiện trạng đã kiểm chứng — sạch

`grep` toàn bộ `src/`, kiểm tra network, đọc config:

- **Không analytics.** Không error reporting.
- **Không CDN.** `next/font` self-host lúc build.
- `public/sql-wasm.wasm` **serve từ origin của mình** — không fetch WASM từ CDN. Việc này vừa giữ offline-first vừa không rò rỉ pattern sử dụng.
- **Zero external URL trong `src/`.**
- Không secret nào bị commit. `.agent/mcp_config.json` chỉ có placeholder, đã untracked + gitignored.

Đây là tài sản, không phải mặc định. **Giữ nó.**

## 2. Luật bất biến: không dependency gọi mạng lúc runtime

Mọi thứ phải bundle offline. Ràng buộc này quyết định vài lựa chọn cụ thể:

- **Chuyển đổi âm–dương lịch**: phải là thư viện bundle sẵn, pin version, test năm biên + tháng nhuận. **Không** gọi service qua mạng.
- **Font**: chỉ self-host lúc build.
- **Ảnh avatar**: hiện dùng `<img>` remote thẳng → **rò rỉ privacy** (mỗi lần render là một request tới host bên thứ ba, kèm referrer), và với cây lớn là 500 request eager. Không phải lỗ XSS. Cách xử lý: lưu ảnh vào Drive/Photos của user, hoặc bắt user tải lên, hoặc tối thiểu `referrerpolicy="no-referrer"` + lazy.
- **OCR / nhận diện mặt** (nếu làm sau): chỉ chấp nhận WASM chạy client. Gọi Cloud Vision API là **gửi ảnh gia đình lên server bên thứ ba** — phá cam kết cốt lõi.

## 3. Nỗi lo của người dùng là thật, không phải giả định

Trích nguyên văn từ ~700 comment:

- *"pub web thì lộ hết tên cả gia tộc, rồi lũ trẻ sao dám đi học, thật vô đạo bất lương"*
- *"Xong mấy cháu đi học nhớ giấu kĩ web gia phả nhá, không thì tên không chỉ kèm theo phụ huynh thôi đâu"*
- *"Thiệt luôn à, rồi database có gửi về server không đó"*
- *"Cái này mà bảo mật tốt nữa là nhiều người cần lắm"*
- *"Mình muốn data người dùng app của bạn"* → *"lấy được cây gia phả rồi làm gì nữa bạn, mình hỏi giùm **chú hàng xóm áo xanh**"* (4 like)
- Comment top của post AncestorTree, 23 like: *"Nếu lưu dữ liệu gia phả của mọi người trên đám mây tập trung của bạn, sẽ không mấy ai muốn dùng."*

Người ta lo **doxxing cả dòng họ** và **bị thu thập dữ liệu**. Đây là yếu tố quyết định mua, không phải checkbox tuân thủ.

## 4. Mặc định khi publish / share

Chưa thuộc v1 (D2: một người dùng). Nhưng khi làm, mặc định bắt buộc:

- **Không index** (`noindex`, không sitemap).
- **Không lộ người còn sống** — ẩn hoặc rút gọn theo mặc định.
- Không avatar thật cho người sống.
- Bật từng nhánh, không bật cả cây.

Cảnh báo từ thực tế: `tocvoquangngai` **công bố đồ thị quan hệ đầy đủ của 292 người đang sống, không auth**. Giảm nhẹ duy nhất là avatar chỉ là placeholder `img_avatar_man.svg` — **không lộ mặt thật**. Và `giaphax` có **catalogue công khai các cây đã publish** + `logAnalyticsEvent`.

## 5. Field nhạy cảm

| Field | Mức | Ghi chú |
|---|---|---|
| Số CCCD / căn cước | **Cao nhất** | Xem §6 |
| Số điện thoại | Cao | Danh bạ cả dòng họ là mục tiêu hấp dẫn |
| Địa chỉ + toạ độ nhà | Cao | Kết hợp với quan hệ huyết thống thành profile đầy đủ |
| Vị trí mộ phần | Trung bình | |
| Link Facebook | Trung bình | Liên kết danh tính thật |
| Ảnh mặt người sống | Cao | |
| Ngày sinh đầy đủ | Trung bình | Ngày sinh + tên mẹ là bộ câu hỏi bảo mật kinh điển |

## 6. Quét CCCD — khuyến nghị

`README` có kế hoạch quét thẻ căn cước để tự điền thông tin. Đánh giá thẳng thắn:

**Đừng lưu số CCCD.** Dùng thông tin quét được để **điền tên, ngày sinh, quê quán** rồi **bỏ số đi**. Lý do:
- Số CCCD không giúp gì cho việc vẽ gia phả — nó không phải dữ liệu phả hệ.
- Nó biến file gia phả thành mục tiêu có giá trị thật.
- File này đồng bộ lên Drive và được export ra ngoài — mỗi bản copy là một chỗ rò.

Nếu về sau bắt buộc phải lưu (ví dụ dùng cho hồ sơ, xét lý lịch — có user nêu use case này): phải **opt-in tường minh cho từng người**, và cân nhắc mã hoá ở tầng field với khoá do user giữ. Không lưu mặc định.

## 7. Bề mặt tấn công client

Không backend nghĩa là XSS là con đường chính, và token OAuth nằm trong bộ nhớ trang (xem [sync-durability.md](sync-durability.md) §5.4).

- **Không `dangerouslySetInnerHTML`, không `eval`.** Hiện chưa có, giữ nguyên.
- **Sanitize mọi URL do user nhập** — Facebook, Google Maps, avatar. Chặn `javascript:`, `data:`. Chỉ cho `http`/`https`.
- Tên người được render vào DOM và vào SVG → escape ở cả hai chỗ.
- **CSP header**: static export nên phải đặt ở tầng hosting. Chưa có.
