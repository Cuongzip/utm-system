# 04. Giám Sát Trực Tuyến, Điều Khiển C2 & Giả Lập 4D

> [← Lập kế hoạch & Duyệt bay](03-lap-ke-hoach-va-duyet-bay.md) | [Mục lục](README.md) | [Tiếp theo: An toàn Không phận & Khẩn cấp →](05-an-toan-khong-phan-va-ung-pho-khan-cap.md)

Hướng dẫn theo dõi toàn cảnh bầu trời, dự báo va chạm sớm 4D, gửi lệnh điều khiển từ xa tới tàu bay đang hoạt động và vận hành phòng giả lập.

---

## 1. Trung tâm Tổng quan (`Dashboard`)

**Đường dẫn**: `Operations` → **Dashboard** (`/dashboard`)

Cung cấp bức tranh toàn cảnh không phận chỉ trong một màn hình:

- **Dải chỉ số KPI**: Số chuyến bay đang hoạt động (`Active Flights` & số luồng truyền trực tiếp), số trạm trực tuyến (`Hubs Online`), tổng đội tàu (`Registered Fleet`) và số xung đột cần xử lý (`Airspace Conflicts`). Nếu có xung đột phân cách, thanh cảnh báo đỏ xuất hiện ngay phía trên bản đồ kèm nút **Resolve →**.
- **Bản đồ Chiến thuật (`Tactical Map`)**:
  - Bật/tắt nhanh từng lớp thông tin trên thanh tiêu đề thẻ: **`LIVE TRAFFIC`**, **`AIRSPACE`**, **`HUBS`**, **`ADS-B`** (tàu bay có người lái lân cận).
  - Nút **`Reset`** (góc trên trái bản đồ): Đưa khung nhìn quay lại bao quát toàn bộ mạng lưới Vertiport và chuyến bay đang hoạt động.
- **Dự báo Không phận 4D (`4D FORESIGHT`)**:
  1. Nhấn nút **`4D FORESIGHT`** trên thanh tiêu đề bản đồ để mở bảng điều khiển dự báo quỹ đạo tương lai (`3m`, `5m` hoặc `10m` tới).
  2. Kéo thanh trượt thời gian hoặc nhấn **Play** để quan sát vị trí dự kiến của toàn bộ tàu bay và các điểm nguy cơ mất phân cách (**Predicted CPA**).
  3. Nhấp vào một cảnh báo CPA để mở bảng **Air Traffic Director** xem gợi ý giải pháp điều chỉnh độ cao/tốc độ và nhấn xem trước kết quả mô phỏng (`Preview`).
- **Bảng điều hành phía dưới**:
  - **Recent Flights**: 6 chuyến bay mới nhất kèm hành trình rút gọn và trạng thái; nhấp trực tiếp vào dòng bất kỳ để mở chi tiết chuyến bay.
  - **Active Alerts**: Danh sách cảnh báo chưa xử lý với vạch màu mức độ rủi ro (Đỏ: nghiêm trọng, Cam: cao/trung bình), lệnh tự động đi kèm (`LAND`, `RTH`), mã chuyến bay và nút xác nhận nhanh **`ACK`**.

---

## 2. Đài Điều hành Trực tuyến (`Control Center`)

**Đường dẫn**: `Operations` → **Control Center** (`/dashboard/control-center`)

Dành cho điều hành viên và phi công giám sát chuyên sâu từng chuyến bay đang hoạt động:

### Chọn mục tiêu & Đọc thông số (`Live Telemetry`)

1. Chọn chuyến bay từ hộp chọn **Select active flight** ở cột bên phải (có ô tìm kiếm nhanh theo mã chuyến bay hoặc số đăng ký UAV), hoặc nhấp trực tiếp vào biểu tượng drone trên bản đồ **Operations Radar**.
2. Theo dõi 4 đồng hồ thông số trực tuyến:
   - **Altitude (AGL)**: Độ cao so với mặt đất và trần bay cho phép.
   - **Ground Speed**: Tốc độ bay ngang (`km/h` và `m/s`).
   - **Battery Pack**: Phần trăm dung lượng pin (tự động chuyển cam khi `<= 40%` và đỏ khi `< 20%`).
   - **Heading**: Góc hướng mũi bay (`0°–359°` kèm hướng la bàn).
3. Kiểm tra thanh trạng thái cuối bảng: chế độ bay hiện tại (**MODE**), tình trạng tuân thủ hành lang (**CORRIDOR**: `CONFORMANT` xanh hoặc `BREACH` đỏ — rê chuột vào để xem độ lệch ngang/đứng tính bằng mét) và tọa độ tức thời (**POSITION**).

### Phát lệnh Điều khiển Từ xa (`Flight Control`)

Bảng **Flight Control** ở góc dưới trái cung cấp 6 lệnh điều hành chuẩn và 1 nút khẩn cấp:

- **`TKOF`** _(Takeoff)_: Phát lệnh cất cánh (chỉ mở khi tàu bay còn dưới mặt đất).
- **`LAND`**: Hạ cánh thẳng đứng ngay tại tọa độ hiện tại _(có hộp thoại xác nhận an toàn)_.
- **`RTH`** _(Return to Home)_: Hủy hành trình hiện tại và quay về Vertiport xuất phát _(có hộp thoại xác nhận)_.
- **`PAUSE` / `HOVER` / `RESUME`**: Tạm dừng hành trình, giữ vị trí treo tại chỗ hoặc tiếp tục bay theo lộ trình.
- **`EMERGENCY STOP`** _(Nút đỏ)_: Cắt khẩn cấp / kích hoạt cơ chế dừng an toàn tối cao khi có nguy cơ tai nạn tức thời _(bắt buộc xác nhận trước khi gửi)_.

Mọi lệnh gửi đi đều được ghi nhận trạng thái thực thi (`PENDING`, `COMPLETED`, `FAILED`) ngay tại bảng **Recent Commands** kế bên.

---

## 3. Phòng Giả lập Bay 4D (`Simulation`)

**Đường dẫn**: `Operations` → **Simulation** (`/dashboard/simulation`)

Cho phép kiểm thử lộ trình, huấn luyện điều hành viên và diễn tập tình huống khẩn cấp mà không cần cất cánh phương tiện thật:

- **Tab `Sessions`**:
  - Nhấn **+ Launch Simulation** → chọn chuyến bay hoặc cấu hình kịch bản giả lập → nhấn khởi chạy.
  - Khi phiên giả lập đang chạy (`RUNNING`), hệ thống tự động phát luồng viễn trắc thời gian thực lên cả `Dashboard` và `Control Center` như một chuyến bay thật.
  - Sử dụng các nút **Pause**, **Resume**, **Stop** hoặc nhấn vào phiên giả lập để xem chi tiết thông số động lực học.
- **Tab `Devices`**: Bật nguồn (`Power ON`) hoặc tắt nguồn (`Power OFF`) nhanh các thiết bị kết nối ảo để kiểm thử kịch bản mất tín hiệu đường truyền.
