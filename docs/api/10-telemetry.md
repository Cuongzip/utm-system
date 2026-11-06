# 10. MODULE TELEMETRY (Thực thể: `TelemetryRecord`)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Tiếp nhận dữ liệu viễn trắc GPS thời gian thực (tần số 1Hz) từ Drone IoT hoặc Bộ giả lập Simulator, lưu trữ chuỗi thời gian (Time-series) và phát sóng trực tiếp (Real-time Broadcast) qua WebSocket STOMP tới ATC Radar và màn hình điều hành Cesium 3D.

---

## 10.1 Cấu Trúc Bảng Dữ Liệu (`telemetry_record`)

> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

### Các Cột Nghiệp Vụ Riêng Biệt (Domain Columns)

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `varchar(36)` | `string` | **PK**, NOT NULL | UUID định danh bản ghi viễn trắc |
| `drone_id` | `varchar(36)` | `string` | **FK** -> `drone.id`, NOT NULL | Định danh phương tiện drone phát viễn trắc |
| `flight_id` | `varchar(36)` | `string` | **FK** -> `flight.id`, NULLABLE | Chuyến bay đang thực hiện (nếu đang trong nhiệm vụ) |
| `latitude` | `decimal(10, 7)` | `number` | NOT NULL | Vĩ độ GPS hiện tại (WGS84, -90 đến 90) |
| `longitude` | `decimal(10, 7)` | `number` | NOT NULL | Kinh độ GPS hiện tại (WGS84, -180 đến 180) |
| `altitude` | `decimal(8, 2)` | `number` | NOT NULL | Cao độ hiện tại so với mực nước biển MSL (mét) |
| `speed` | `decimal(6, 2)` | `number` | NULLABLE | Tốc độ mặt đất (m/s) |
| `heading` | `decimal(6, 2)` | `number` | NULLABLE | Góc hướng mũi máy bay la bàn (0 - 360 độ) |
| `pitch` | `decimal(6, 2)` | `number` | NULLABLE | Góc ngẩng/chúi đầu máy bay (độ) |
| `roll` | `decimal(6, 2)` | `number` | NULLABLE | Góc nghiêng cánh máy bay (độ) |
| `yaw` | `decimal(6, 2)` | `number` | NULLABLE | Góc xoay thân máy bay (độ) |
| `battery_percentage` | `decimal(5, 2)` | `number` | NULLABLE | Dung lượng pin còn lại (0 - 100%) |

---

## 10.2 Kênh Phát Sóng Thời Gian Thực (WebSocket STOMP)

Ngoài REST API, dữ liệu viễn trắc sau khi tiếp nhận và lưu trữ thành công được phát sóng tức thời qua STOMP Broker (Endpoint kết nối: `/ws` hỗ trợ SockJS fallback):
- `/topic/telemetry/live`: Luồng phát sóng vị trí của toàn bộ các drone đang hoạt động trên hệ sinh thái UTM.
- `/topic/telemetry/drone/{droneId}`: Luồng riêng biệt theo drone phần cứng.
- `/topic/telemetry/flight/{flightId}`: Luồng riêng biệt phục vụ giám sát hành trình chi tiết của một chuyến bay cụ thể.

---

## 10.3 Chi Tiết Từng Endpoint

### 10.3.1 `POST /api/v1/telemetry`
Tiếp nhận gói tin GPS viễn trắc tức thời từ Drone phần hardware hoặc Engine mô phỏng chuyến bay.

- **Chỉ định role**: `pilot, admin, hub_operator`
- **Input (Request Body)** - Model: `TelemetryIngestVm`:
  ```json
  {
    "droneId": "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "flightId": "f1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "latitude": 10.7769,
    "longitude": 106.7009,
    "altitude": 85.5,
    "speed": 12.0,
    "heading": 145.0,
    "pitch": 1.5,
    "roll": -0.8,
    "yaw": 145.0,
    "batteryPercentage": 82.5
  }
  ```
- **Logic xử lý cốt lõi**:
  1. Ghi bản ghi vào cơ sở dữ liệu `telemetry_record`.
  2. Cập nhật bộ đệm in-memory vị trí tức thời theo drone (`latestDroneTelemetryCache`) và theo chuyến bay (`latestFlightTelemetryCache`).
  3. Bắn tin STOMP WebSocket tới client hiển thị (`/topic/telemetry/live`, `/topic/telemetry/drone/{droneId}`, `/topic/telemetry/flight/{flightId}`).
- **Phản hồi thành công**: `201 Created` - Model: `TelemetryRecordVm`.

---

### 10.3.2 `GET /api/v1/telemetry/flight/{flightId}`
Lấy toàn bộ chuỗi tọa độ viễn trắc lịch sử của một chuyến bay để vẽ lại toàn bộ quỹ đạo bay (Replay / Trajectory playback).

- **Chỉ định role**: `admin, atc, hub_operator, pilot`
- **Input (Query Params)**:
  - `from` (`string (ISO-8601 UTC)`, tùy chọn): Thời điểm bắt đầu lọc
  - `to` (`string (ISO-8601 UTC)`, tùy chọn): Thời điểm kết thúc lọc
- **Phản hồi thành công**: `200 OK` - Danh sách `List<TelemetryRecordVm>`.

---

### 10.3.3 `GET /api/v1/telemetry/flight/{flightId}/latest`
Lấy vị trí GPS tức thời mới nhất của một chuyến bay (ưu tiên đọc từ in-memory cache, nếu cache rỗng thì truy vấn bản ghi mới nhất từ DB).

- **Chỉ định role**: `admin, atc, hub_operator, pilot`
- **Phản hồi thành công**: `200 OK` - Model: `TelemetryRecordVm`:
  ```json
  {
    "id": "t1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "droneId": "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "flightId": "f1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "latitude": 10.7769,
    "longitude": 106.7009,
    "altitude": 85.5,
    "speed": 12.0,
    "heading": 145.0,
    "pitch": 1.5,
    "roll": -0.8,
    "yaw": 145.0,
    "batteryPercentage": 82.5,
    "timestamp": "2026-10-10T08:30:15Z"
  }
  ```
- **Lỗi thường gặp**: `404 Not Found` nếu chưa có dữ liệu viễn trắc cho chuyến bay này.

---

### 10.3.4 `GET /api/v1/telemetry/drone/{droneId}`
Lấy toàn bộ chuỗi tọa độ viễn trắc lịch sử của một phương tiện drone hardware (hữu ích khi kiểm tra drone bảo trì, trạm sạc, hoặc kiểm tra trước khi cất cánh).

- **Chỉ định role**: `admin, atc, hub_operator, pilot`
- **Input (Query Params)**:
  - `from` (`string (ISO-8601 UTC)`, tùy chọn): Thời điểm bắt đầu lọc
  - `to` (`string (ISO-8601 UTC)`, tùy chọn): Thời điểm kết thúc lọc
- **Phản hồi thành công**: `200 OK` - Danh sách `List<TelemetryRecordVm>`.

---

### 10.3.5 `GET /api/v1/telemetry/drone/{droneId}/latest`
Lấy vị trí GPS tức thời mới nhất của một phương tiện drone (ưu tiên đọc từ in-memory cache, nếu cache rỗng thì truy vấn bản ghi mới nhất từ DB).

- **Chỉ định role**: `admin, atc, hub_operator, pilot`
- **Phản hồi thành công**: `200 OK` - Model: `TelemetryRecordVm`.
- **Lỗi thường gặp**: `404 Not Found` nếu chưa có dữ liệu viễn trắc cho drone này.
