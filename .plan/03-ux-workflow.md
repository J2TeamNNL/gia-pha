# UI / UX Philosophy & Workflow Standard

Châm ngôn dự án: **Nhanh và Tiện là Số 1. Không làm người dùng thấy ngợp trước form điền.**

## 1. Progressive Disclosure (Hiển Thị Lũy Tiến)

Mọi form nhập liệu trong hệ thống đều phải tuân theo 2 trạng thái: **Quick Mode** và **Full Mode**.

### Quick Mode (Mặc định khi ấn nút Add Node)

Mục đích: Cho phép người tạo Family Tree đập tay trên bàn phím liên tục, điền liên hoàn 5-10 người chỉ trong 1 phút.
**Form Gồm:**

1. **Họ Tên** (Input text thông minh: Tự bóc tách chuỗi theo dấu cách. Vd nhập "Nguyễn Văn A" -> Backend form tự chia `Last: Nguyễn`, `Middle: Văn`, `First: A`).
2. **Giới tính** (Radio buttons to, rõ ràng: 🙎‍♂️ Nam / 🙎‍♀️ Nữ).
3. **Quan hệ** (Dropdown: Là Vợ/Chồng/Con của Node đang click để thêm).

_Chỉ vậy thôi. Bấm Save -> Mọc ra 1 Node mới trên cây!_

### Full Mode (Khi click vào "Tùy chọn nâng cao" hoặc khi Edit Profile)

Mục đích: Điền chi tiết như gia phả giấy.
Form xổ dài, chia thành các Card Component (hoặc Tab):

- **Card 1: Ngày sinh & Căn Chi** (Ngày/tháng/năm Dương, checkbox Quy đổi Âm lịch).
- **Card 2: Trạng Thái Sinh Tử** (Checkbox Đã mất -> Hiện ra thêm form ngày mất, vị trí mồ mả, ngày giỗ).
- **Card 3: Phương thức liên lạc** (SĐT, Google Maps Address... để phục vụ Social Net phase).

---

## 2. Smart Memory (Lưu Trí Nhớ Người Nhập)

**Bài toán:** Tại sao người dùng phải mở form Full Mode khi họ CHỈ MUỐN QUAN TÂM tới số điện thoại của mọi người?
**Giải pháp:**
Sử dụng Local Storage / State (Zustand). Nếu một người dùng ở phiên làm việc trước liên tục mở phần "Số điện thoại" để khai báo cho các thành viên. Ở lần nhấn nút "Add Node" kế tiếp, form Quick Mode sẽ tự động "thò" thêm 1 trường nữa là "Số Điện Thoại" bên dưới tên và giới tính!
_Hệ thống tự học theo thói quen khai báo của người dùng!_

---

## 3. Data Ingestion (Automation Workflow)

Để giải quyết sự "Lười gõ phím", ta có các Workflow Input thay thế:

### Workflow 3.1: File Import

- Button UI: "Import từ file GEDCOM" (Chuẩn chung của các app gia phả MyHeritage, Ancestry).
- Button UI: "Import từ mẫu Excel" (Cho phép tải file Tempalte CSV vè, copy/paste hàng loạt rồi up lên duyệt).

### Workflow 3.2: AI OCR (Công Cụ Thần Thánh)

Dành cho người lớn tuổi. Quá dài để gõ? Chỉ cần dùng Camera điện thoại đè lên mặt quyển **Sổ Hộ Khẩu** hoặc thẻ **CCCD / CMTND**.

1. Nhấn nút "Scan". Camera Browser mở ra.
2. Chụp 1 phát ảnh nét.
3. Chạy hàm Web Worker đẩy qua `Tesseract.js` (hoặc Cloud API).
4. Phân tích văn bản Regex:
   - "Họ và tên: LÊ VĂN BA" -> Bơm vào Input Tên = Lê Văn Ba.
   - "Giới tính: Nam" -> Chọn Radio Nam.
   - "Ngày Sinh: 01/02/1950" -> Bơm vào 3 ô Ngày, Tháng, Năm.
   - "Quê Quán..." -> Bơm vào Address.
5. Người dùng chỉ việc liếc mắt kiểm tra xem OCR cắn nhận diện có chuẩn không, nhấn Save. Xong 1 mạng!

---

## 4. Visualization & Sơ Đồ UI

- Tránh làm giao diện Modal đè chồng chéo lên nhau. App sẽ chia làm 2 Panel (Split Pane):
  - **Left / Center**: Vùng bạt (Canvas) khổng lồ chứa cây gia phả, có thể Zoom in/out, pan chuột kéo thả như Google Maps.
  - **Right Panel**: Khi nhấp (Click) vào 1 người, 1 thanh Panel từ mép phải trượt ra (Sliding Drawer). Chứa toàn bộ Data của người đó ở chế độ "View Only" (Read Mode).
  - Vẫn ở Right Panel, nhấn nút Edit -> Biến thành Mode Form như mục 1. Tiết kiệm không gian cực kỳ gọn.
