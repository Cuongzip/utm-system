# 01. Bản Đồ Chiến Thuật 3D/2D & Giao Diện Chung

> [← Mục lục Hướng dẫn](README.md) | [Tiếp theo: Hạ tầng & Đội tàu bay →](02-ha-tang-va-doi-tau.md)

Hướng dẫn thao tác không gian bản đồ 3D/2D, quy ước màu sắc hiển thị, trợ lý AI và tùy chỉnh cá nhân dùng chung trên toàn ứng dụng.

---

## 1. Bố cục Màn hình Chính

Giao diện được chia làm 3 vùng cố định:

- **Thanh điều hướng trái (Sidebar)**: Chia thành 4 cụm nghiệp vụ (`Operations`, `Planning & Assets`, `Safety & Weather`, `Platform`), nút mở trợ lý **Operations Copilot (AI)** và thông tin tài khoản / nút đăng xuất (`Sign Out`). Trên thiết bị màn hình nhỏ, thanh này thu gọn thành nút menu góc trên trái.
- **Thanh tiêu đề trang (Page Header)**: Hiển thị tên phân hệ, trạng thái kết nối trực tuyến (ví dụ `15 LIVE WS`, `ONLINE`, `STANDBY`) và các nút tác vụ chính ở góc phải.
- **Không gian làm việc trung tâm**: Bảng dữ liệu, biểu đồ KPI hoặc giao diện chia đôi Bản đồ — Biểu mẫu (`Split View`).

---

## 2. Điều khiển Bản đồ Chiến thuật (Cesium 3D/2D)

### Thao tác Chuột & Cảm ứng

| Thao tác                                                  | Chế độ `2D`                                                           | Chế độ `3D`                                                    |
| --------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Kéo chuột trái**                                        | Di chuyển (Pan) bản đồ                                                | Di chuyển (Pan) mặt đất                                        |
| **Con lăn chuột / Kéo chuột phải**                        | Phóng to / thu nhỏ (Zoom)                                             | Phóng to / thu nhỏ khoảng cách camera                          |
| **Giữ `Ctrl` + Kéo chuột trái** _(hoặc nhấn giữ con lăn)_ | —                                                                     | Xoay hướng nhìn (`Heading`) và đổi góc nghiêng (`Pitch`) tự do |
| **Nhấp chuột trái vào đối tượng**                         | Chọn tàu bay, tuyến bay, Vertiport hoặc điểm xung đột để xem chi tiết | Tương tự `2D`                                                  |

### Thanh Công cụ Góc Trên Phải Bản đồ

- **`3D` / `2D`**: Chuyển đổi tức thời giữa không gian 3 chiều (tự động nghiêng góc nhìn chiến thuật `48°`, hiển thị khối vùng trời 3D, rèm độ cao dưới lộ trình và đường gióng từ drone xuống mặt đất) và bản đồ phẳng `2D`.
- **La bàn (`Reset North`)**: Kim la bàn xoay trực tiếp theo hướng bắc thực tế; nhấp vào để đưa bản đồ quay ngay về chính Bắc (`0°`).
- **Góc nghiêng `48°` / `90°`** _(chỉ hiện ở chế độ `3D`)_: Chuyển nhanh giữa góc nhìn xiên `48°` (quan sát độ cao) và góc nhìn thẳng từ đỉnh xuống `90°`.
- **Lớp nền (`Basemap Layers`)**: Chọn 1 trong 5 chế độ bản đồ nền (tự động ghi nhớ cho các lần mở sau):
  - `Satellite Hybrid` _(Mặc định)_: Ảnh vệ tinh kèm nhãn tên đường và địa danh.
  - `Satellite Clean`: Ảnh vệ tinh thuần không chữ, tối ưu khi cần quan sát mật độ đường bay dày.
  - `Tactical Dark`: Nền tối độ tương phản cao, làm nổi bật cảnh báo và vệt bay phát sáng.
  - `Light Gray Canvas`: Nền xám sáng tối giản phục vụ tra cứu quy hoạch vùng trời.
  - `Street Map`: Bản đồ hành chính và giao thông chi tiết.
  - _Lưu ý_: Khi hệ thống được cấu hình token địa hình 3D, menu này tự động xuất hiện thêm 2 công tắc **OSM 3D Buildings** (tòa nhà 3D đô thị) và **World Terrain** (địa hình độ cao thực tế).
- **Toàn màn hình (`Fullscreen`)**: Mở rộng bản đồ chiếm trọn màn hình trình duyệt (nhấn `Esc` để thoát nhanh).

### Thanh Trạng thái Góc Dưới Phải (Map HUD)

Hiển thị tự động theo thời gian thực:

- **Tọa độ con trỏ**: Vĩ độ, kinh độ (`lat, lng`) ngay tại vị trí mũi chuột trên mặt đất.
- **`CAM`**: Độ cao hiện tại của camera quan sát (ví dụ `CAM 3.1 km`).
- **Thước tỷ lệ động**: Chiều dài thực tế trên mặt đất tương ứng với mức phóng hiện tại (`50 m` → `50 km`).

---

## 3. Quy ước Màu sắc Không phận & Tàu bay

| Đối tượng trên bản đồ                                                               | Màu sắc               | Ý nghĩa vận hành                                                  |
| ----------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------- |
| **Vùng cấm bay / Khu vực cấm** (`no_fly_zone`, `prohibited`, `emergency_exclusion`) | Đỏ                    | Tuyệt đối không bay xuyên qua trong dải cao độ `[Floor, Ceiling]` |
| **Vùng hạn chế** (`restricted`, `temporary_restriction`)                            | Cam                   | Yêu cầu cấp phép đặc biệt từ kiểm soát không lưu                  |
| **Vùng cảnh báo** (`warning`)                                                       | Vàng                  | Khu vực chướng ngại vật cao tầng hoặc lưu ý an toàn               |
| **Hành lang & Vùng Vertiport** (`hub_corridor`, `hub_zone`, `controlled`)           | Xanh lam / Cyan       | Hành lang bay chuẩn và vùng kiểm soát tiếp cận bãi đáp            |
| **Tàu bay trực tuyến bình thường**                                                  | Xanh lá (`#10b981`)   | Đang truyền viễn trắc ổn định, pin an toàn (`>= 20%`)             |
| **Tàu bay đang được chọn**                                                          | Xanh sáng (`#00e5ff`) | Đang khóa mục tiêu theo dõi kèm vệt đuôi bay phát sáng            |
| **Tàu bay cảnh báo pin yếu / sự cố**                                                | Đỏ (`#ef4444`)        | Pin dưới `20%` hoặc đang kích hoạt chế độ khẩn cấp                |

---

## 4. Trợ lý AI (Operations Copilot) & Cài đặt (Settings)

- **Operations Copilot (`AI`)**: Nhấp nút **Operations Copilot** ở cuối thanh menu trái để mở bảng hội thoại trợ lý điều hành — hỗ trợ tóm tắt nhanh tình trạng không phận, giải thích cảnh báo xung đột hoặc tra cứu thông tin chuyến bay bằng ngôn ngữ tự nhiên.
- **Settings (`/dashboard/settings`)**:
  - Tra cứu hồ sơ tài khoản, vai trò chính và bảng đối chiếu 12 quyền nghiệp vụ được cấp.
  - Cài đặt chế độ bản đồ mặc định (`2D` / `3D`) và lớp nền yêu thích.
  - Mở nhanh trang tài liệu cổng tích hợp `Swagger UI` (dành cho kỹ thuật viên).
