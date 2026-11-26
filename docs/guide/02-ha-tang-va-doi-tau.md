# 02. Quản Lý Hạ Tầng, Phương Tiện & Đội Tàu Bay

> [← Bản đồ & Giao diện chung](01-ban-do-va-giao-dien-chung.md) | [Mục lục](README.md) | [Tiếp theo: Lập kế hoạch & Duyệt bay →](03-lap-ke-hoach-va-duyet-bay.md)

Hướng dẫn thiết lập danh mục nền tảng trước khi khai thác chuyến bay: Đơn vị vận hành, bãi cất/hạ cánh Vertiport, tàu bay UAV, kết nối thiết bị và cân bằng tải đội bay.

---

## 1. Đơn vị Khai thác (`Organizations`)

**Đường dẫn**: `Planning & Assets` → **Organizations** (`/dashboard/organizations`)  
**Quyền thêm/sửa/xóa**: `Admin` (các vai trò khác có quyền tra cứu).

- **Thêm tổ chức mới**: Nhấn **+ Add Organization** → nhập tên pháp nhân, mã số đăng ký kinh doanh/khai thác hàng không, đầu mối liên hệ và trạng thái hoạt động (`Active` / `Suspended`) → nhấn **Save**.
- **Tra cứu & lọc**: Sử dụng ô tìm kiếm theo tên/mã đăng ký hoặc bộ lọc trạng thái ngay trên đầu bảng.

---

## 2. Trạm Cất/Hạ cánh Vertiport (`Hubs`)

**Đường dẫn**: `Planning & Assets` → **Hubs** (`/dashboard/hubs`)  
**Quyền tạo/xóa**: `Admin` · **Quyền cập nhật cấu hình**: `Admin`, `Hub Operator`.

Màn hình cung cấp dải chỉ số tổng quan (**Total Hubs**, **Active Hubs**, **Maint / Inactive**, **Pad Load / Cap**) và 2 chế độ hiển thị ở góc trên phải:

- **Split** _(Mặc định)_: Kết hợp danh sách bên trái và bản đồ tương tác bên phải. Nhấp vào một Vertiport trên bảng hoặc trên bản đồ để mở thẻ thông tin chi tiết (`Map Inspector`: tọa độ, bán kính vùng trời bảo vệ, sức chứa và số drone đang đỗ).
- **Table**: Mở rộng bảng dữ liệu toàn chiều ngang khi cần rà soát số lượng lớn.

### Tạo mới hoặc chỉnh sửa Vertiport

1. Nhấn **+ Add Hub** (hoặc chọn biểu tượng thao tác `...` → **Edit** trên dòng tương ứng).
2. Điền mã trạm (bật **AUTO-GEN** để hệ thống tự sinh mã chuẩn hoặc tắt để tự nhập, ví dụ `HUB-SGN-D1`), tên trạm, trạng thái (`Active`, `Maintenance`, `Inactive`) và sức chứa đồng thời tối đa (`Max Simultaneous Drones`).
3. **Chọn vị trí chính xác**: Nhập tọa độ hoặc bật chế độ chọn điểm trên bản đồ (**Click map to place Vertiport coordinates**) để nhấp trực tiếp lên vị trí thực địa.
4. Thiết lập bán kính bảo vệ (`Airspace Radius`) và dải độ cao kiểm soát (`Floor / Ceiling`) → nhấn **Save**.

---

## 3. Hồ sơ Tàu bay UAV (`Drones`)

**Đường dẫn**: `Planning & Assets` → **Drones** (`/dashboard/drones`)  
**Quyền đăng ký/sửa**: `Admin`, `Hub Operator` · **Quyền xóa**: `Admin`.

1. Nhấn **+ Register Drone** để mở biểu mẫu đăng ký phương tiện.
2. Khai báo **Số đăng ký** (`Registration Number`), dòng máy (`Model`), hãng sản xuất (`Manufacturer`), tải trọng tối đa, dung lượng pin, đơn vị sở hữu (`Owner Organization`) và trạm đỗ chính (`Home Hub`).
3. Theo dõi trạng thái phương tiện trực tiếp trên bảng:
   - `AVAILABLE`: Sẵn sàng nhận nhiệm vụ hoặc chuyến bay mới.
   - `IN FLIGHT`: Đang thực hiện hành trình bay.
   - `CHARGING` / `MAINTENANCE` / `INACTIVE`: Tạm ngưng phân công bay.

---

## 4. Kết nối Thiết bị & Bảo mật PKI (`Connectivity`)

**Đường dẫn**: `Operations` → **Connectivity** (`/dashboard/connectivity`)

Quản lý định danh phần cứng truyền dữ liệu (`DRONE`, `GATEWAY`, `GCS`) và tối ưu băng thông viễn trắc:

- **Đăng ký thiết bị (`+ Register Device`)**: Gắn kết thiết bị vật lý/mô phỏng với tàu bay và giao thức truyền tin.
- **Chứng thư số X.509 (`Certificate`)**: Nhấn nút xem chứng thư trên dòng thiết bị để kiểm tra thời hạn hiệu lực, mã vân tay bảo mật hoặc thu hồi quyền kết nối (`Revoke`) khi phát hiện rủi ro.
- **Kiểm tra kết nối (`Ping Heartbeat`)**: Gửi tín hiệu kiểm tra phản hồi tức thời của thiết bị.
- **Chuyển chế độ tần số viễn trắc (`Adaptive Telemetry Mode`)**: Điều chỉnh tốc độ gửi gói tin GPS/cảm biến của từng thiết bị (tiết kiệm pin khi bay hành trình ổn định hoặc tăng tần số cao khi tiếp cận hạ cánh / khẩn cấp).

---

## 5. Điều phối & Cân bằng Tải Đội bay (`Fleet`)

**Đường dẫn**: `Planning & Assets` → **Fleet** (`/dashboard/fleet`)  
**Quyền truy cập**: `Admin`, `Hub Operator`.

Gồm 3 thẻ nghiệp vụ chuyên sâu giúp tối ưu năng lực khai thác toàn mạng lưới:

1. **Hub Status**: Theo dõi tỷ lệ lấp đầy bãi đáp và số lượng UAV khả dụng tại từng Vertiport theo thời gian thực.
2. **Rebalancing**: Quản lý các lệnh điều chuyển tàu bay rỗng từ trạm dư thừa sang trạm đang thiếu hụt phương tiện (xem danh sách đề xuất chờ duyệt `Pending`, đang bay điều chuyển `Active` và lịch sử `History`).
3. **Configuration**: Chọn cấu hình trọng số chấm điểm tự động khi hệ thống gợi ý gán tàu bay cho nhiệm vụ (ưu tiên pin cao, quãng đường gần, tải trọng phù hợp hay cân bằng giờ bay bảo dưỡng).
