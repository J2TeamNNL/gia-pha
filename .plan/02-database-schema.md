# Data Schema Diagram

Vì hệ thống dùng SQLite (sql.js), ta sẽ định nghĩa Schema Database bằng SQL relations tiêu chuẩn phục vụ cho Gia Phả.

## 1. Nguyên Tắc Thiết Kế (Design Principles)

- **ID là UUIDv4**: Đảm bảo an toàn khi merge dữ liệu từ các nhánh khác nhau trong tương lai (không dùng Integer Auto Increment).
- **Tên cắt nhỏ (Splitted Names)**: Lưu tách rời `first_name`, `last_name`, `middle_name` để tiện sorting và render song ngữ (Việt đọc Last -> First, Anh đọc First -> Last).
- **Ngày tháng là Integer Component**: Không lưu chuỗi String Date. Chia `birth_day`, `birth_month`, `birth_year` thành các cột rỗng `INT NULL` vì gia phả cũ thường người ta **CHỈ NHỚ NĂM SINH**, không nhớ ngày tháng.

## 2. Bảng Chính: `persons`

Bảng này lưu Thông Tin Trực Tiếp của một con người. Không lưu thông tin mối quan hệ ở bảng này (trừ việc xác định Cột Root).

| Cột                     | Kiểu      | Mô tả                                       |
| :---------------------- | :-------- | :------------------------------------------ |
| `id`                    | `UUID`    | PK                                          |
| `first_name`            | `TEXT`    | Tên (bắt buộc)                              |
| `last_name`             | `TEXT`    | Họ                                          |
| `middle_name`           | `TEXT`    | Tên đệm                                     |
| `title_prefix`          | `TEXT`    | Tiền tố (vd: Cụ, Ông bá, Dr.)               |
| `gender`                | `TEXT`    | `MALE` / `FEMALE` / `OTHER`                 |
| `is_living`             | `BOOLEAN` | Đang còn sống?                              |
| `birth_year`            | `INT`     | Năm sinh                                    |
| `birth_month`           | `INT`     | Tháng sinh                                  |
| `birth_day`             | `INT`     | Ngày sinh                                   |
| `death_year`            | `INT`     | Năm mất                                     |
| `death_month`           | `INT`     | Tháng mất                                   |
| `death_day`             | `INT`     | Ngày mất                                    |
| `death_lunar`           | `TEXT`    | Chuỗi Ngày tháng năm Âm lịch mất            |
| `burial_location`       | `TEXT`    | (Tùy chọn) Nơi an nghỉ / Vị trí mồ mả       |
| `phone_number`          | `TEXT`    | Số điện thoại (Chỉ dành cho ai còn sống)    |
| `contact_address`       | `TEXT`    | Địa chỉ hiện tại                            |
| `zalo_link` / `fb_link` | `TEXT`    | Mạng xã hội                                 |
| `avatar_url`            | `TEXT`    | Link ảnh avatar hiện tại                    |
| `biography`             | `TEXT`    | Lịch sử bản thân, chức vụ, kể lể dòng họ... |
| `notes`                 | `TEXT`    | Ghi chú nội bộ                              |

## 3. Bảng Mối Quan Hệ: `relationships`

Đóng vai trò cốt lõi nhất để xác định sơ đồ đồ thị đồ sộ (Graph/Tree).
Để giải quyết đa phu/đa thê, con rể/con dâu, con nuôi, con đẻ, bắt buộc phải dùng Edges Table (Bảng cạnh nối).

| Cột             | Kiểu      | Mô tả                                                                               |
| :-------------- | :-------- | :---------------------------------------------------------------------------------- |
| `id`            | `UUID`    | PK                                                                                  |
| `person_id`     | `UUID`    | ID của Người Đang Xét (Root Node)                                                   |
| `related_to_id` | `UUID`    | ID của người có liên kết với họ                                                     |
| `rel_type`      | `TEXT`    | Kiểu mối quan hệ (Enum)                                                             |
| `is_primary`    | `BOOLEAN` | Cờ chỉ định quan hệ "Chính". (VD 2 ông chồng thì ai là chồng danh chính ngôn thuận) |

### Danh sách `rel_type` (Enum Enum):

1. `PARENT_OF`: person_id là CHA/MẸ đẻ của related_to_id.
2. `ADOPTED_PARENT_OF`: person_id là CHA/MẸ NUÔI của related_to_id.
3. `SPOUSE`: person_id là VỢ/CHỒNG của related_to_id.
4. `EX_SPOUSE`: Vợ/Chồng ly dị.

**Tại sao không lưu cột `father_id` và `mother_id` trực tiếp trong bảng `persons`?**
Vì để giải quyết trường hợp **Đa Thê/Đa Phu**:

- Nếu Ông A có 3 vợ: Bà X, Bà Y, Bà Z.
- Ông M là con của Ông A và Bà Y.
- Cột `father_id` = A, `mother_id` = Y trong bảng Persons là ĐỦ để chạy Tree.
  _Tuy nhiên_, việc tách ra bảng `relationships` với kiểu `SPOUSE` sẽ giúp UI vẽ được nhánh Hôn Nhân ngang hàng (Ông A - nối ngang - Bà X, Y, Z), từ đó dóng nhánh con Ông M chạy từ kết nối (Ông A + Bà Y) xuống. Graph sẽ rất sạch, không bao giờ bị chéo dây.

## 4. Bảng Phụ Trợ (Tương Vấn Optionals)

### Bảng `media_albums` (Chuẩn bị cho Phase 3)

Lưu tập hợp các ID/Link Google Photos ảnh kỷ niệm gán với 1 cá nhân hoặc tập thể.

| Cột          | Kiểu   | Mô tả                                           |
| :----------- | :----- | :---------------------------------------------- |
| `id`         | `UUID` | PK                                              |
| `person_id`  | `UUID` |                                                 |
| `media_type` | `TEXT` | IMAGE / DOCUMENT_PDF (Gia phả giấy cũ scan lại) |
| `url`        | `TEXT` | Link ảnh Drive/Photos                           |

### Bảng `events` (Tương lai - Timeline)

Phục vụ chức năng "Mạng xã hội Gia Đình". Cập nhật các sự kiện như: Lễ tế họ, Xây lại từ đường, Sinh em bé, Đám cưới.
