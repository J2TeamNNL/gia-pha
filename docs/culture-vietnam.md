# Luật domain: gia phả Việt Nam

> Đây là tài liệu quan trọng nhất trong `docs/`. Nó mô tả những gì **không đối thủ nào làm đúng**, và nó sống lâu hơn mọi schema.
>
> Nguồn bằng chứng: `plans/reports/fb-research/` (~700 comment thật trên 5 post về 5 dự án gia phả VN), `plans/reports/web-recon-260821-2312-competitor-web-demos.md` (đo trực tiếp trên gia phả thật của họ Võ Quảng Ngãi, 292 người), `plans/reports/kintree-recon-260821-2312-android-teardown.md`, `plans/reports/fb-research/codex-cross-review.md`.
>
> Quy ước: **[đo]** = kiểm chứng trực tiếp trên dữ liệu thật · **[dẫn]** = trích phản hồi người dùng thật · **[suy]** = suy luận, chưa kiểm chứng.

---

## 1. Tên người

### 1.1 Tách ba phần, không parse
Họ / tên đệm / tên phải là **ba field riêng**, không phải một chuỗi rồi tách bằng khoảng trắng. Tên đệm tiếng Việt có thể nhiều âm ("Nguyễn **Thị Thu** Hà"), và họ ghép tồn tại ("**Nguyễn Phúc**").

**[đo]** KinTree lưu tên như một chuỗi rồi parse — nên sai. Ta tách sẵn thì chính xác hơn mà không mất gì.

### 1.2 Người có thể KHÔNG có tên riêng
**[đo]** Record thật trong gia phả họ Võ: `Bà Võ Văn Mượng` — người vợ được ghi **chỉ bằng tên chồng**, không có tên riêng nào. Đây không phải lỗi nhập liệu, đó là cách gia phả cũ ghi phụ nữ.

Hệ quả bắt buộc:
- **họ / tên đệm / tên KHÔNG được `NOT NULL` cả ba.**
- Phải biểu diễn được trạng thái "chỉ biết là vợ của X".
- Trạng thái đó phải round-trip qua export / import / GEDCOM **mà không tự bịa ra tên**.

### 1.3 Danh hiệu là field riêng
**[đo]** Trong gia phả thật, "Bà", "Ông", "Cụ" nằm **bên trong field tên**. Không được để vậy — tách `honorific` riêng, nếu không mọi thao tác sort, search, so khớp trùng tên đều sai.

### 1.4 ALL-CAPS mã hoá vai vế — anti-pattern
**[đo]** Gia phả họ Võ dùng **chữ IN HOA để mã hoá vai vế**. Đây chính là thứ mà thứ tự con tường minh (§4) thay thế. Khi import dữ liệu kiểu này, coi đây là **migration hazard**: chữ hoa mang thông tin, đừng normalize mất.

### 1.5 Song ngữ
Tên hiển thị cần cả VI và EN. Không dịch tên — cho phép nhập dạng latin hoá / thứ tự phương Tây riêng.

### 1.6 Tránh trùng tên tổ tiên
**[dẫn]** Nhu cầu thật: tra cây gia phả để **không đặt tên con cháu trùng với bậc trưởng bối đời trước**. Cần truy vấn "tên này đã xuất hiện ở đời trên chưa" — và truy vấn đó phải **an toàn với chu trình** (xem §7.3), vì hiện tại chu trình A→B→A chèn được và sẽ làm vòng lặp vô hạn.

---

## 2. Hôn nhân

### 2.1 Đa thê và đa phu là yêu cầu SỐ 1
**[dẫn]** Lặp lại ở **cả 5 post**, là câu hỏi được hỏi nhiều nhất:
- *"1 Ông lấy 2 Bà, thì thể hiện rõ ràng không Bác"* — tác giả dự án trả lời: *"món này đúng là tại hạ chưa lường trước được rồi"*
- *"hai còn ít, cả 3, 4 cơ"*
- *"còn con của ông đó với bà nào nữa"*
- *"ông của mình và ông của vợ mình đều tái hôn với bà 2"*
- *"trường hợp một vợ nhiều chồng nữa"*

**[đo]** Không một site nào trong 4 site đối thủ **render được** đa thê. Dự án duy nhất có model (GIAPHAX) dùng nhãn phẳng `second_wife: "Vợ thứ"`, `concubine: "Thứ thất"` — không trả lời được "con của bà nào", và backend đã chết.

**[đo]** Kể cả app trả phí (KinTree) vẫn lỗi: *"ông em có 3 bà. Em thử tích con của bà 1 thì oke rồi xong tích của bà 2 nó hiện ra như ảnh"*.

→ Đây là **cơ hội lớn nhất** của dự án, và phần lớn là bài toán **layout** (xem [tree-layout.md](tree-layout.md)) chứ không phải bài toán khó về dữ liệu — miễn là dữ liệu có `union`.

### 2.2 Đồng thời khác với lần lượt
Phải phân biệt được:
- **đồng thời** — nhiều vợ cùng lúc
- **lần lượt** — vợ mất rồi cưới bà khác, hoặc ly hôn rồi cưới lại

Cần ngày bắt đầu / kết thúc cho từng cuộc hôn nhân.

### 2.3 Goá KHÔNG phải "vợ/chồng cũ"
Trạng thái hôn nhân phải phân biệt: đang cưới · ly hôn · **goá**. Người vợ đã mất **không phải** `EX_SPOUSE`. Đây là lỗi ngữ nghĩa mà mô hình chỉ có `SPOUSE`/`EX_SPOUSE` không tránh được.

### 2.4 Ngày cưới
**[đo]** KinTree có field ngày cưới. Gia phả cần nó cho việc tính vai vế bên vợ/chồng và cho lịch kỷ niệm.

---

## 3. Con cái và nội / ngoại

### 3.1 Phân loại con
Cần phân biệt: **con đẻ · con nuôi · con riêng · con của người phối ngẫu (con chồng/con vợ) · người được bảo hộ**.

**[dẫn]** Bố/mẹ nuôi bị đòi trực tiếp; tác giả KinTree trả lời: *"nó gọi là cực khó, nhưng để mình xem"* — chưa làm. **[đo]** Không app nào có phân loại nhận nuôi.

Còn phải phân biệt **nhận nuôi bởi cả hai vợ chồng** vs **bởi chỉ một người** — điều này không suy được từ việc hai người là vợ chồng.

### 3.2 `con dâu` / `con rể` / `cháu dâu` là ĐƯỜNG DẪN, không phải loại người
**Đây là luật bất biến của dự án.**

**[dẫn]** Bằng chứng nó gây bug thật: người dùng giapha-os báo *"phần Con dâu thì hiển thị đúng, nhưng **cháu dâu thì sai**"* — tác giả: *"khả năng cao là lỗi của phần mềm"*.

Nguyên nhân: họ lưu "con dâu" như một nhãn gắn vào người. Nhãn đó không tự lan xuống độ sâu tiếp theo, nên `cháu dâu` sai. Cách đúng: nhãn được **suy ra từ đường dẫn có kiểu** — chuỗi cạnh huyết thống rồi kết thúc bằng một cạnh hôn nhân. Suy ra được ở **độ sâu bất kỳ**.

### 3.3 Chính tộc / ngoại tộc
**[dẫn]** *"con dâu thì là về nội tộc, nhưng rể thì lại là ngoại rồi"*. Con dâu vào nội tộc; con rể thuộc ngoại tộc. Phải phân biệt được, vì nó quyết định người đó có xuất hiện trong bản in gia phả chính hay không.

### 3.4 Quy ước phụ hệ — cần là lựa chọn, không phải luật cứng
**[dẫn]** *"gia phả theo huyết thống thường cây cho con trai là dài, chứ con gái là tầm đến đời con là không cập nhật nữa vì họ theo gia phả người khác rồi"*.

Đây là quy ước truyền thống, **không phải** thứ phần mềm được áp đặt. Cần là **cấu hình**: có tiếp tục nhánh con gái hay không. Mặc định nên tiếp tục (không cắt dữ liệu của ai), nhưng cho phép ẩn khi in bản truyền thống.

### 3.5 Thứ tự con thuộc về cuộc hôn nhân, không thuộc về người
Xem §4.

---

## 4. Thứ tự con — phải nhập tay được

**[dẫn]** Bị đòi nhiều lần: *"thêm tính năng sắp xếp theo con cả, con thứ 2, thứ 3"*, *"nhà 3 anh em thì anh cả ngoài cùng bên trái, xong tới người thứ 2, rồi tới em út ngoài cùng bên phải"*. Tác giả KinTree luôn trả lời *"dựa trên tuổi đó bạn"*.

**Dựa trên tuổi là sai, vì hai lý do độc lập:**

1. **[dẫn] Năm sinh thường KHÔNG có ở các đời trên.** *"trên 2 đời thì mình chịu thua vụ năm sinh rồi… giờ tìm được người nhớ năm sinh anh/chị/em của ông bà nội ngoại chua lắm"*. Chính tác giả cũng thừa nhận: *"nếu không biết năm sinh thì hoặc là phải tự định ra, hoặc không phân biệt được"*.
2. **Vai vế không suy được từ tuổi** — xem §5.1.

**Thứ tự con thuộc về cuộc hôn nhân / quan hệ cha-mẹ, không thuộc về bản thân người đó.** Vì với con riêng, con nuôi, gia đình chắp nối, đa thê, thì "thứ mấy" khác nhau tuỳ đếm theo bà nào hay đếm chung cả nhà. Phải có override thủ công.

---

## 5. Xưng hô / vai vế

Đây là tính năng được đòi nhiều nhất sau đa thê, và **không dự án nào giải xong**.

**[dẫn]** Comment được like cao nhất trong post Gia-Pha-Dien-Tu (58 like): *"Có tính toán được 2 người bất kỳ phải gọi xưng hô nhau như thế nào chưa bạn"*. Tác giả gạt đi: *"cái này tính toán được, nhưng mình nghĩ không phải usecase thường dùng"* → bị phản biện ngay: ***"usecase thường dùng chứ bạn, họ đông không biết ai gọi ai là gì"***.

Tác giả giapha-os thì thẳng thắn: *"vụ xưng hô em chưa nghĩ ra cách giải quyết ạ"*.

**[đo]** Chỉ một site duy nhất thấy chạy thật: `tocvoquangngai` hiện *"Võ Quý **là ông ngoại của** Võ Minh Huy"* — và đúng bên ngoại.

### 5.1 Vai anh/chị/em họ ĐỆ QUY theo vai của cha mẹ, không theo tuổi cá nhân
**[dẫn]** Bằng chứng đối thủ làm sai, do người dùng chứng minh công khai:

> *"vai vế trong nhà chưa ổn, app đang so theo tuổi trong khi thực tế tính theo vai của ba mẹ. Ví dụ app đang để con gái của dì là **chị** vì lớn tuổi hơn mình, nhưng thực tế thì mình lớn hơn do dì là **em** của mẹ."*
> Case cụ thể: mẹ SN 1948, dì SN 1953 → con của dì là **em họ**, dù lớn tuổi hơn.

Tác giả phản bác "nó có so theo vai vế rồi mà bạn" — **sai**, app vẫn dùng tuổi.

**Luật**: vai anh/chị/em họ = đệ quy theo vai của cha/mẹ tương ứng. Chỉ dùng năm sinh khi vai cha mẹ **bằng nhau**, hoặc khi hai người là ruột cùng cha mẹ. Và đây là **policy có override**, không phải luật cứng.

### 5.2 Vai bên vợ/chồng suy từ người RUỘT
**[dẫn]** KinTree diễn đạt đúng: *"khi lấy vợ thì nhà vợ có em dù có hơn tuổi chồng cũng sẽ vẫn là em vợ"*.

→ "chị dâu / em dâu / anh rể / em rể" suy từ **vai của người ruột**, không từ tuổi của người dâu/rể, cũng không từ cha mẹ của họ.

### 5.3 Bác/chú/cô vs cậu/dì cần biết bên nội hay ngoại + giới tính
Thứ tự của cha mẹ một mình **không đủ** để chọn từ. Phải biết đường dẫn đi qua bên nội hay bên ngoại, và giới tính của người được gọi.

### 5.4 Vai đời thắng tuổi
Cháu 60 tuổi vẫn gọi chú 35 tuổi là chú. Khoảng cách đời và đường huyết thống phải được xác định **trước** khi tính bất kỳ so sánh vai vế nào.

### 5.5 Khác nhau theo vùng miền và theo từng nhà
**[dẫn]** *"chi tiết hơn nữa là cho thay đổi xưng hô theo từng miền"*, *"với mỗi vùng văn hoá sẽ khác 1 tý"*, *"này để ra Bác hay chú thì cũng khó vì do vùng miền ngôn ngữ khác nhau"*.

Cần **policy cấu hình được** (Bắc / Trung / Nam + quy ước riêng của dòng họ), không hardcode chuỗi. Và từ vựng phải dịch được (app song ngữ).

**[đo]** KinTree **không có** cấu hình vùng miền — tác giả tự thừa nhận *"chưa đầy đủ lắm, cần phân biệt theo vùng miền nữa"*.

### 5.6 Xưng hô phụ thuộc NGƯỜI XEM
**[dẫn]** Tác giả giapha-os: *"cách xưng hô còn tuỳ vào người xem là ai nữa ạ"*. Nhãn phải tính theo góc nhìn, không phải thuộc tính tĩnh trên card.

### 5.7 Phải trả về "không xác định được"
Có 14 trường hợp quy tắc đệ quy không đủ — liệt kê đầy đủ ở `plans/reports/fb-research/codex-cross-review.md` §3 và trong spec `plans/260821-2350-restructure-v1/proposal-kinship.md`. Ví dụ: mẹ và dì **sinh đôi** · không biết năm sinh của cả hai · vai cha mẹ bằng nhau hoặc tranh chấp · con nuôi được coi là con cả · hai người có hai đường huyết thống.

Engine phải trả `{path, label, confidence, rule_used, override?}` và **nói "không xác định được" thay vì đoán**. Đoán sai một danh xưng trước mặt cả họ tệ hơn là để trống.

---

## 6. Ngày tháng và lịch

### 6.1 Lưu đúng lịch mà gia đình khai
**[dẫn]** Phản hồi trực tiếp về giapha-os: *"chỗ ngày mất bạn mặc định để đó là ngày AL xong nếu có đổi sang DL. Chứ nhập vào lại là ngày DL thì không đúng. Vì cúng giỗ là tính ngày âm."* Tác giả lưu dương rồi convert — người dùng nói thẳng là sai.

Nhưng **"ngày giỗ luôn lưu âm lịch" cũng là công thức sai.** Invariant đúng:

> **Lưu đúng giá trị VÀ đúng loại lịch mà gia đình khai.**

- Khai "mất ngày 12 tháng 7 âm" → lưu âm.
- Có giấy chứng tử ghi dương → lưu dương, **không** convert rồi coi âm là gốc.
- Chiều còn lại là **dẫn xuất, có thể cache, nhưng không phải nguồn chân lý.**

### 6.2 Ngày mất KHÁC ngày giỗ
Hai sự kiện riêng biệt:
- **ngày mất thật**
- **ngày giỗ gia đình cúng** — có thể khác lịch, hoặc gia đình cố ý cúng lệch ngày

Không được gộp làm một.

### 6.3 Tháng nhuận là bắt buộc, không phải nice-to-have
`tháng 4` và `tháng 4 nhuận` là **hai ngày khác nhau**. Cần cờ `is_leap_month`.

Và: nếu ngày giỗ gốc rơi vào tháng nhuận, thì **những năm không có tháng nhuận đó phải cúng ngày nào?** Đây là quyết định của gia đình. **Phần mềm KHÔNG được tự chọn.** Phải hỏi và lưu policy.

### 6.4 Độ chính xác
Cần `precision`: chính xác · chỉ biết tháng · chỉ biết năm · khoảng chừng.

Lý do: các cụ đời trên thường chỉ nhớ năm, hoặc chỉ nhớ "khoảng năm Ất Dậu". Ép nhập ngày đầy đủ sẽ tạo ra dữ liệu bịa.

### 6.5 Can Chi
Giáp Tý, Ất Sửu… suy được từ năm âm lịch. Lưu dẫn xuất, nhưng cho phép **ghi đè** khi gia phả giấy ghi Can Chi mà không ghi năm — lúc đó Can Chi là dữ liệu gốc, không phải dẫn xuất.

### 6.6 Chuyển đổi phải offline
Chuyển âm ↔ dương cần bảng/thư viện. **Bắt buộc bundle offline**, pin version, test năm biên và tháng nhuận. Local-first loại bỏ mọi lựa chọn gọi service qua mạng — xem [privacy.md](privacy.md).

Ngoài khoảng năm mà thư viện hỗ trợ: **hiện ngày âm đã lưu và nói rõ "không chuyển đổi được"**. Đoán tệ hơn là bỏ trống.

### 6.7 Nhắc giỗ phải tính lại mỗi năm
Ngày giỗ âm lịch ứng với một ngày dương khác nhau mỗi năm. Không được cache một lần rồi dùng mãi.

---

## 7. Cấu trúc dòng họ

### 7.1 Là FOREST, không phải TREE
**[đo]** Gia phả họ Võ có **106 record ở "ĐỜI 1"** — đây là **rừng ~50 gốc**, không phải cây một gốc.

Hệ quả:
- Nhiều gốc / component rời rạc là trạng thái **bình thường**, không phải lỗi.
- Anchor là **theo từng component**; đổi anchor có thể nhảy sang component khác.
- "Không có đường đi giữa hai người" là **câu trả lời hợp lệ**, khác với "không xác định được".

Code hiện tại giả định một anchor duy nhất và render canvas rỗng khi không giải được — không mang giả định đó đi tiếp.

### 7.2 Chi / nhánh / đời
**[đo]** AncestorTree quảng cáo tự động tính chi / nhánh / đời. Ta hiện chỉ có khái niệm generation.

**[dẫn]** Cũng có đề xuất mã thứ tự dạng `a2, a3, c4` để nhận dạng vai vế theo nhánh.

Lưu ý: **thứ tự chi/nhánh chính thức có thể theo trưởng dòng**, không theo tuổi của cha mẹ trực tiếp. Cần thứ tự con ổn định tại **mọi điểm phân nhánh của tổ tiên** và một policy chi/nhánh tường minh.

### 7.3 Hôn nhân cận huyết trong họ → đồ thị có chu trình
**[dẫn]** Được hỏi thẳng: *"trường hợp có quan hệ họ hàng lấy nhau thì có xử lý được không"*. Tác giả KinTree né rồi thừa nhận: *"theo mình biết thì khi có trường hợp đó thì người vợ sẽ bị tách khỏi gia đình, cái đấy có 1 lần mình thấy vậy thôi còn xử lý như thế nào thì mình cũng chưa nghĩ tới"*. Người hỏi: *"em suy nghĩ về kỹ thuật triển khai từ lâu nhưng chưa tìm ra giải pháp"*.

**Luật cho dự án này**: cùng một `person_id` **có thể** tới được bằng hai đường huyết thống cộng một đường hôn nhân. Schema phải cho phép đồ thị có chu trình. Renderer chọn **một spanning tree** để đọc được, nhưng:

> **Không bao giờ clone một người để giữ hình dạng cây.** Nhân bản tạo ra hai tiểu sử xung đột và làm sai mọi phép tính vai vế. Giữ cross-link, dedupe theo `person_id`.

Và mọi phép duyệt cây (đặc biệt là kiểm tra trùng tên tổ tiên ở §1.6) phải **an toàn với chu trình**.

---

## 8. Hiển thị và in ấn

### 8.1 Người đã mất: KHÔNG đánh dấu gì — chỉ hiện năm
Trên FB có tranh luận: người dùng đòi ký hiệu (*"ở avatar có thêm ký hiệu kiểu gạch chéo ở góc"*), tác giả lo *"giao diện hơi bị đau lòng đặc biệt nếu gia đình có người trẻ mất"*.

**[đo] Thực tế giải quyết dứt điểm:** trên gia phả thật của họ Võ, card người đã mất và người còn sống **giống hệt nhau về style** — Võ Quý (1957–2016) và Võ Hòa (1976–?) render y như nhau. **Năm mất là toàn bộ tín hiệu.**

**[dẫn]** Cũng có người nói đúng điều đó: *"Đã mất thì hiện thêm năm mất là được rồi. Xem sẽ tự hiểu mà."* Và: *"người đã mất nên hiển thị ngày giỗ chứ không cần năm sinh, năm mất"*.

→ **Hiện năm. Không thêm marker.** Kéo theo: ngày tháng mới là thứ mang nghĩa, nên `is_living` phải **suy ra / optional**, không phải cờ `NOT NULL` load-bearing. (Bug thật đã tìm ra: NULL `is_living` map thành `false` → gắn ✝ cho người còn sống.)

### 8.2 Trang nghiêm là yêu cầu thiết kế
**[dẫn]** *"Vì web dạng này tần suất truy cập ít, nhưng lại yêu cầu sự **trang nghiêm** nhiều hơn."*

Đây là ràng buộc thiết kế thật, không phải ý kiến thẩm mỹ. Gia phả không phải dashboard.

### 8.3 In ấn
**[dẫn]** In sơ đồ rất khó: *"in cái sơ đồ ra khá khó, hoặc in thì cũng chỉ in được 1 nhánh tầm 4-5 đời là max"*. Giải pháp của họ: export dạng **văn bản readable** thay vì sơ đồ.

**[dẫn]** Có lưu ý văn hoá: *"cũng **kiêng để mặt người** lên"* bản in — một người nêu, chưa xác nhận là phổ biến. **[suy]** Nên để ảnh trên bản in là **lựa chọn tắt được**, mặc định tắt.

**[dẫn]** "Bảng tông đồ" đẹp thì chưa ai làm được: *"in ra được nhưng em chưa làm được giao diện màu mè như thế này"* — người ta phải dùng phần mềm đồ hoạ hoặc Gemini để tự làm infographic.

Xuất PDF/ảnh kèm năm sinh bị đòi nhiều lần, chưa ai đáp ứng.

### 8.4 Người dùng chính là người cao tuổi
**[đo]** KinTree có đổi **phông chữ và cỡ chữ**. **[dẫn]** *"font chữ nó nhỏ quá bác ạ"*.

Đây không phải tính năng phụ — trưởng họ và các cụ là người đọc chính.

### 8.5 Nhập trên desktop, tra trên điện thoại
**[dẫn]** *"Nhập ở điện thoại thấy hơi bất tiện"* → lời khuyên của chính tác giả: *"bác dùng máy tính nhập một lượt thì nhanh hơn, về sau có thay đổi nhỏ gì thì sửa trên điện thoại"*.

→ Desktop tối ưu cho **nhập hàng loạt**; mobile tối ưu cho **tra cứu và sửa nhỏ**. Không cố làm cả hai giống nhau.

---

## 9. Bối cảnh sử dụng

### 9.1 Mùa vụ: Tết
**[dẫn]** *"nhu cầu cao vì Tết nhất về nhiều khi họ hàng xa không nhớ để xưng hô và dạy cho con"*, *"ám ảnh nhất là lâu lâu về quê nhưng không biết cô này là ai, bác kia tên gì"*, *"thời xưa bố mẹ nhớ tới cả những người họ hàng 7-8 đời, thời nay khéo anh em họ hàng cùng ông nội gặp nhau cũng chưa biết là ai"*.

Cầu bùng nổ dịp Tết. **[suy]** Nhưng tần suất dùng cả năm rất thấp — nên tính năng phải có giá trị ở lần dùng **đầu tiên**, không dựa vào việc quay lại thường xuyên.

### 9.2 Tránh hôn nhân cận huyết
**[dẫn]** 10 like: *"Đỡ xảy ra việc cháu yêu cô, chú yêu cháu do không biết họ hàng"*. Đây là động lực dùng thật, không phải joke.

### 9.3 Nỗi lo privacy là thật
**[dẫn]** *"pub web thì lộ hết tên cả gia tộc, rồi lũ trẻ sao dám đi học"* · *"database có gửi về server không đó"* · *"cái này mà bảo mật tốt nữa thì nhiều người cần lắm"* · *"lấy được cây gia phả rồi làm gì nữa bạn, mình hỏi giùm chú hàng xóm áo xanh"*.

Xem [privacy.md](privacy.md).

---

## Câu chưa trả lời được

- "Kiêng để mặt người lên bản in" phổ biến đến đâu? Chỉ một người nêu.
- Quy ước chi/nhánh khác nhau thế nào giữa các dòng họ — có chuẩn hoá được không, hay bắt buộc phải cấu hình từng nhà?
- Khi ngày giỗ gốc ở tháng nhuận, các gia đình thực tế xử lý thế nào? Cần khảo sát thêm trước khi thiết kế UI cho policy §6.3.
- Bảng từ vựng xưng hô Bắc / Trung / Nam đầy đủ — chưa có nguồn nào kiểm chứng được.
