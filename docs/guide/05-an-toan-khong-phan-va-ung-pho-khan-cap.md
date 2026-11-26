# 05. An Toàn Không Phận, Khí Tượng & Ứng Phó Khẩn Cấp

> [← Giám sát & Điều hành trực tuyến](04-giam-sat-va-dieu-hanh-truc-tuyen.md) | [Mục lục](README.md) | [Tiếp theo: Tích hợp OEM & Developer →](06-tich-hop-oem-va-developer.md)

Hướng dẫn thiết lập vùng hạn chế bay, kiểm tra thời tiết hàng không, giải tỏa xung đột phân cách và vận hành trung tâm ứng phó sự cố khẩn cấp.

---

## 1. Quản lý Vùng trời & Hàng rào Địa lý (`Airspace`)

**Đường dẫn**: `Safety & Weather` → **Airspace** (`/dashboard/airspace`)  
**Quyền tạo/sửa**: `Admin`, `ATC`, `Hub Operator` · **Quyền xóa**: `Admin`, `ATC`.

### Tạo vùng kiểm soát hoặc vùng cấm bay mới

1. Nhấn **+ New Airspace Zone** để mở trình biên tập không gian.
2. Chọn 1 trong 2 phương thức dựng hình trên thanh công cụ bản đồ:
   - **`Radius (Circle)`**: Nhấp lên bản đồ để đặt tâm và điều chỉnh bán kính (`Radius`) ở cột phải — thanh thông tin góc dưới trái tự động tính diện tích vùng phủ.
   - **`Draw Polygon`**: Nhấp liên tiếp từ 3 điểm trở lên trên bản đồ để khép kín đa giác (có đường nét đứt dẫn hướng theo con trỏ và hiển thị diện tích thực `ha` / `km²`). Sau khi vẽ, bạn có thể **nắm kéo trực tiếp từng đỉnh tròn trắng** để tinh chỉnh ranh giới chính xác trên cả nền `2D` và `3D`.
3. Ở cột bên phải (**Tab `Details`**):
   - Chọn phân loại vùng (**Classification Type**: `No-Fly Zone`, `Prohibited`, `Restricted`, `Warning`, `Hub Corridor`...).
   - Đặt độ cao đáy (**Floor**) và trần (**Ceiling**) tính bằng mét, kèm khung thời gian hiệu lực nếu là vùng hạn chế tạm thời.
4. Nhấn **Save Airspace Zone**.

> **Kiểm tra nhanh trước chuyến bay (`Pre-Flight Check`)**: Ngay tại trang danh sách `Airspace`, nhấn nút **Pre-Flight Check** để kiểm tra thử một tuyến tọa độ xem có vi phạm vùng cấm hay thông báo hàng không hiện hành hay không.

---

## 2. Khí tượng Hàng không & Thông tin Không lưu (`Weather & AIS`)

**Đường dẫn**: `Safety & Weather` → **Weather & AIS** (`/dashboard/weather`)

- **Dải đánh giá `Go / No-Go` theo Vertiport**: Hàng thẻ trên cùng hiển thị phán quyết điều kiện thời tiết tức thời tại từng bãi đáp (`GO`, `MARGINAL` hoặc `NO GO`). Nhấp vào thẻ trạm bất kỳ để xem tốc độ gió, gió giật, tầm nhìn, lượng mưa và dự báo chi tiết tại tab **Hub Weather & Forecast**.
- **METAR / TAF / SIGMET**: Tra cứu bản tin khí tượng sân bay chuẩn hàng không và cảnh báo hiện tượng thời tiết nguy hiểm trong khu vực.
- **NOTAM Board**: Bảng điện tử tổng hợp các thông báo hạn chế hoạt động bay có hiệu lực.
- **Live ADS-B Traffic**: Danh sách tàu bay thương mại / có người lái đang phát tín hiệu ADS-B xung quanh khu vực quản lý.

---

## 3. Giám sát & Giải tỏa Xung đột (`Conflicts`)

**Đường dẫn**: `Safety & Weather` → **Conflicts** (`/dashboard/conflicts`)  
**Quyền giải tỏa**: `Admin`, `ATC`.

Khi hai tàu bay vi phạm ngưỡng phân cách an toàn ngang hoặc đứng, hệ thống tự động tạo bản ghi xung đột:

1. **Định vị trên bản đồ**: Bản đồ trung tâm tự động làm nổi bật cặp chuyến bay đang xung đột kèm vòng cảnh báo và đường gióng độ cao 3D tại điểm tiếp cận gần nhất.
2. **Quét kiểm tra tức thời (`Scan Airspace`)**: Nhấn nút quét ở góc trên phải để yêu cầu hệ thống đánh giá lại khoảng cách phân cách toàn không phận ngay lập tức.
3. **Xử lý nghiệp vụ**:
   - Nhấn **Acknowledge** để xác nhận kiểm soát viên đã tiếp nhận tình huống.
   - Sau khi điều phối tàu bay tách giãn an toàn (qua `Control Center`), nhấn **Resolve** và nhập ghi chú phương án xử lý để đóng xung đột và lưu vào bảng lịch sử kiểm toán (**Resolved Conflicts**).

---

## 4. Trung tâm Ứng phó Khẩn cấp & Hộp đen (`Emergency`)

**Đường dẫn**: `Safety & Weather` → **Emergency** (`/dashboard/emergency`)

Quản lý toàn bộ sự cố nghiêm trọng (mất liên lạc C2 kéo dài, tụt áp pin khẩn cấp, hỏng động cơ, trôi lệch khỏi hành lang):

### Hai chế độ vận hành an toàn (`Supervised` vs `Auto`)

Công tắc chế độ trên thanh tiêu đề trang _(dành cho `Admin` / `ATC`)_ quyết định cách hệ thống phản ứng khi phát hiện nguy hiểm:

- **Supervised Mode** _(Có giám sát)_: Hệ thống đề xuất lệnh cứu nạn (`RTH` hoặc `LAND`) và bật hộp thoại chờ điều hành viên nhấn **Confirm** hoặc **Reject**.
- **Autonomous Safety Mode** _(Tự hành an toàn)_: Hệ thống tự động phát lệnh cứu nạn khẩn cấp tới tàu bay ngay lập tức mà không chờ thao tác tay.

### Điều tra Sự cố & Phát lại Hộp đen (`Blackbox Replay`)

- **Protocols**: Cấu hình hành động cứu nạn mặc định tương ứng với từng loại hỏng hóc và mức độ nghiêm trọng.
- **Incident History & Blackbox Replay** (`/dashboard/emergency/incidents/[id]`): Nhấp vào một sự cố để mở trang điều tra chi tiết — kéo thanh trượt **Flight Blackbox Replay** để tua lại từng khung thời gian (`Frame`), quan sát chính xác vị trí 3D, độ cao và dung lượng pin của tàu bay trước và trong thời điểm xảy ra sự cố.
- **Trends** (`/dashboard/emergency/trends`): Thống kê xu hướng sự cố theo loại nguyên nhân và thời gian để phục vụ bảo dưỡng phòng ngừa.
