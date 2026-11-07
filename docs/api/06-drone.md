# 06. MODULE DRONE & COMMANDS (Thực thể: `Drone`, `DroneCommand`)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Quản lý toàn diện hồ sơ phương tiện bay không người lái (UAS/UAV), biển số đăng ký quốc gia, thông số tải trọng, dung lượng pin và trạng thái sẵn sàng bay; đồng thời quản lý trạm điều hành mặt đất (C2/GCS), phát lệnh bay chiến thuật thời gian thực, định tuyến qua WebSocket Gateway và theo dõi phản hồi/xác nhận từ máy bay.

---

## 6.1 Cấu Trúc Bảng Dữ Liệu

### Bảng `drone`
> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `registration_number` | `varchar(100)` | `string` | NOT NULL, **UNIQUE** | Biển số đăng ký quốc gia (vd: `VN-UAV-001`) |
| `manufacturer` | `varchar(100)` | `string` | NOT NULL | Hãng chế tạo (DJI, Autel, v.v.) |
| `model` | `varchar(100)` | `string` | NOT NULL | Dòng máy bay (Matrice 350 RTK, v.v.) |
| `owner_id` | `varchar(36)` | `string` | **FK** -> `organization.id` | Tổ chức sở hữu máy bay |
| `home_hub_id` | `varchar(36)` | `string` | **FK** -> `hub.id` | Bãi đáp căn cứ / nơi đỗ gốc |
| `battery_capacity_wh` | `double precision` | `number` | NOT NULL | Dung lượng pin định mức (Watt-giờ) |
| `max_payload` | `double precision` | `number` | NOT NULL | Tải trọng hàng hóa tối đa (kg) |
| `status` | `varchar(50)` | `DroneStatus` | NOT NULL, Default: `'available'` | Trạng thái máy bay |

---

### Bảng `drone_command`
> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `drone_id` | `varchar(36)` | `string` | **FK** -> `drone.id`, NOT NULL | Drone nhận lệnh |
| `flight_id` | `varchar(36)` | `string` | **FK** -> `flight.id`, NULLABLE | Chuyến bay liên đới |
| `command_type` | `varchar(50)` | `CommandType` | NOT NULL | Loại lệnh điều khiển |
| `parameters` | `text` | `string` / `JSON` | NULLABLE | Tham số chi tiết (tọa độ hạ cánh khẩn, cao độ mới...) |
| `status` | `varchar(50)` | `CommandStatus` | NOT NULL, Default: `'pending'` | Trạng thái thực thi lệnh |
| `issued_by` | `varchar(100)` | `string` | NOT NULL | Định danh người phát lệnh (Pilot / ATC / Failsafe Brain) |
| `issued_at` | `timestamptz` | `string (ISO 8601)` | NOT NULL | Thời điểm phát lệnh |
| `acknowledged_at` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm Drone nhận lệnh |
| `completed_at` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm hoàn thành lệnh |
| `error_message` | `text` | `string` | NULLABLE | Thông báo lỗi nếu thất bại |
| `priority` | `integer` | `number` | NOT NULL, Default: `2` | Mức ưu tiên (0: Khẩn cấp nhất, 1: Cao, 2: Bình thường, 3: Cấu hình) |
| `timeout_ms` | `integer` | `number` | NOT NULL, Default: `2000` | Thời gian chờ tối đa (mili-giây) |
| `retry_count` | `integer` | `number` | NOT NULL, Default: `0` | Số lần đã thử lại |
| `max_retries` | `integer` | `number` | NOT NULL, Default: `2` | Số lần thử lại tối đa cho phép |

---

## 6.2 Các Enum Định Nghĩa

```typescript
export type DroneStatus =
  | "available"    // Sẵn sàng nhận nhiệm vụ bay
  | "in_flight"    // Đang thực hiện chuyến bay trên không
  | "maintenance"  // Đang bảo dưỡng / kiểm tra kỹ thuật
  | "charging"     // Đang sạc pin tại trạm
  | "offline";     // Mất kết nối / không khả dụng

export type CommandType =
  | "takeoff"          // Lệnh cất cánh (tự động chuyển Drone sang in_flight)
  | "land"             // Lệnh hạ cánh tại chỗ
  | "rtl"              // Bay về điểm xuất phát (Return-to-Launch / Return-to-Home)
  | "emergency_stop"   // Ngắt điện động cơ ngay lập tức (chuyển Drone sang maintenance)
  | "pause"            // Tạm dừng lộ trình bay
  | "hover"            // Bay treo tại chỗ giữ vị trí
  | "resume"           // Tiếp tục bay theo lộ trình
  | "goto"             // Bay tới tọa độ chỉ định
  | "set_altitude"     // Thay đổi trần bay
  | "update_mission"   // Cập nhật lại chuỗi mốc nhiệm vụ
  | "set_home"         // Cập nhật lại bãi đáp an toàn
  | "configure";       // Cấu hình tham số trên drone

export type CommandStatus =
  | "pending"          // Đang trong hàng đợi phát
  | "sent"             // Đã gửi qua WebSocket Gateway
  | "acknowledged"     // Drone đã xác nhận nhận lệnh
  | "executing"        // Drone đang thực thi lệnh
  | "completed"        // Thực thi hoàn tất thành công
  | "failed"           // Thất bại
  | "cancelled";       // Đã hủy trước khi thực thi
```

---

## 6.3 Mối Quan Hệ Liên Kết (Relationships)

- **`Organization` (N - 1)**: Đơn vị sở hữu `drone.owner_id -> organization.id`.
- **`Hub` (N - 1)**: Trạm căn cứ lưu trú `drone.home_hub_id -> hub.id`.
- **`DeviceRegistration` (1 - 1)**: Thiết bị phần cứng kết nối `drone.id <- device_registrations.drone_id`.
- **`Flight` (1 - N)**: Lịch sử các chuyến bay `drone.id <- flight.drone_id`.
- **`DroneCommand` (1 - N)**: Chuỗi các lệnh phát cho drone `drone.id <- drone_command.drone_id`.

---

## 6.4 Chi Tiết Từng Endpoint

### 6.4.1 `GET /api/v1/drones`
Lấy danh sách máy bay không người lái có phân trang, tìm kiếm và bộ lọc.

- **Chỉ định role**: Authenticated
- **Input (Query Params)**: `?status=available&homeHubId=...&ownerId=...&search=DJI&limit=20&offset=0`
  - `search`: Tìm kiếm tự do theo biển số (`registrationNumber`), dòng máy (`model`), hãng (`manufacturer`).
- **Phản hồi thành công**: `200 OK` - Model: `DroneListVm`:
  ```json
  {
    "items": [
      {
        "id": "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "registrationNumber": "VN-UAV-001",
        "manufacturer": "DJI",
        "model": "Matrice 350 RTK",
        "ownerId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "homeHubId": "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "batteryCapacityWh": 588.0,
        "maxPayload": 2.7,
        "status": "available",
        "createdOn": "2026-10-10T08:00:00Z"
      }
    ],
    "total": 1
  }
  ```

---

### 6.4.2 `GET /api/v1/drones/{id}`
Lấy chi tiết cấu hình kỹ thuật của Drone kèm thông tin làm giàu (Enriched DTO).

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `DroneVm` (làm giàu thông tin từ `organization`, `hub`, `connectivity`):
  ```json
  {
    "id": "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "registrationNumber": "VN-UAV-001",
    "manufacturer": "DJI",
    "model": "Matrice 350 RTK",
    "ownerId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "homeHubId": "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "batteryCapacityWh": 588.0,
    "maxPayload": 2.7,
    "status": "available",
    "owner": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Drone Express Global Corp",
      "code": "GP-2026-DK01"
    },
    "homeHub": {
      "id": "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "code": "HUB-SGN-01",
      "name": "Central Vertiport Hub D1"
    },
    "createdOn": "2026-10-10T08:00:00Z"
  }
  ```
- **Phản hồi lỗi**: `404 Not Found`.

---

### 6.4.3 `POST /api/v1/drones`
Đăng ký mới một Drone vào đội bay.

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Input (Request Body)** - Model: `DronePostVm`:
  ```json
  {
    "registrationNumber": "VN-UAV-001",
    "manufacturer": "DJI",
    "model": "Matrice 350 RTK",
    "ownerId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "homeHubId": "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "batteryCapacityWh": 588.0,
    "maxPayload": 2.7
  }
  ```
- **Logic xử lý cốt lõi**:
  1. **Registration Number Generation & Unique Check**:
     - Nếu `registrationNumber` bỏ trống hoặc null: Tự động sinh mã duy nhất theo rule `DRONE_REGISTRATION` (`DRN-YYYY-XXXX`, ví dụ `DRN-2026-V27T`).
     - Nếu người dùng nhập tay: Chuẩn hóa trim/uppercase và kiểm tra trùng lặp trong DB. Nếu đã tồn tại $\rightarrow$ `409 Conflict`.
  2. **Inter-service Verification**:
     - Kiểm tra `ownerId` tồn tại qua `OrganizationClientService` (ném `404` nếu không tìm thấy).
     - Kiểm tra `homeHubId` tồn tại qua `HubClientService` (ném `404` nếu không tìm thấy).
  3. **Validation**: `batteryCapacityWh > 0`, `maxPayload >= 0`.
  4. Khởi tạo `status = 'available'`.
- **Phản hồi thành công**: `201 Created` - Model: `DroneVm`.
- **Phản hồi lỗi**: `400 Bad Request`, `404 Not Found`, `409 Conflict`.

---

### 6.4.4 `PUT /api/v1/drones/{id}`
Cập nhật thông số bảo trì, tải trọng hoặc trạm căn cứ của Drone.

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Input (Request Body)** - Model: `DronePutVm`:
  ```json
  {
    "homeHubId": "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "batteryCapacityWh": 588.0,
    "maxPayload": 2.7,
    "status": "maintenance"
  }
  ```
- **Chốt chặn an toàn bay (Domain Safety Guard)**:
  - Nếu Drone đang có trạng thái `in_flight`: Nghiêm cấm đổi `homeHubId`, đổi `maxPayload`, hoặc chuyển sang `maintenance` $\rightarrow$ Ném `400 Bad Request`.
  - Nếu đổi `homeHubId`: Kiểm tra trạm mới có tồn tại qua `HubClientService` hay không.
- **Phản hồi thành công**: `200 OK` - Model: `DroneVm`.
- **Phản hồi lỗi**: `400 Bad Request`, `404 Not Found`.

---

### 6.4.5 `DELETE /api/v1/drones/{id}`
Vô hiệu hóa (Soft-delete chuyển sang `offline`) máy bay.

- **Chỉ định role**: `admin`
- **Chốt chặn an toàn bay**: Nghiêm cấm vô hiệu hóa nếu Drone đang trong chuyến bay (`status = 'in_flight'`).
- **Xử lý**: Cập nhật `status = 'offline'`.
- **Phản hồi thành công**: `200 OK` kèm `{"message": "Drone removed successfully"}`.
- **Phản hồi lỗi**: `400 Bad Request`, `404 Not Found`.

---

### 6.4.6 `POST /api/v1/drones/{droneId}/commands`
Phát lệnh điều khiển bay chiến thuật (C2/GCS) xuống Drone.

- **Chỉ định role**: `admin, hub_operator, pilot, atc`
- **Input (Request Body)** - Model: `DroneCommandPostVm`:
  ```json
  {
    "commandType": "rtl",
    "flightId": "f1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "priority": 1,
    "timeoutMs": 3000,
    "parameters": "{\"reason\": \"BATTERY_LOW\", \"landingPad\": \"PAD-EMERGENCY-B\"}"
  }
  ```
- **Logic xử lý cốt lõi**:
  1. Kiểm tra Drone tồn tại trong hệ thống (ném `404 Not Found` nếu không tìm thấy).
  2. Tự động tính toán `priority` (0: Khẩn cấp nhất, 1: Cao, 2: Chuẩn, 3: Thấp), `timeoutMs` và `maxRetries` dựa trên `commandType` nếu người dùng không truyền:
     - **Priority 0**: `EMERGENCY_STOP`, `LAND` (Timeout: 500ms, Max retries: 3).
     - **Priority 1**: `RTL`, `HOVER`, `PAUSE` (Timeout: 1000ms, Max retries: 2).
     - **Priority 2**: `TAKEOFF`, `GOTO`, `SET_ALTITUDE`, `RESUME` (Timeout: 2000ms, Max retries: 2).
     - **Priority 3**: `UPDATE_MISSION`, `SET_HOME`, `CONFIGURE` (Timeout: 5000ms, Max retries: 1).
  3. Trích xuất `issuedBy` từ Security Context (JWT), fallback về `"operator"`.
  4. **Side-effects trạng thái bay**:
     - Nếu `commandType == 'takeoff'`: Tự động cập nhật `drone.status = 'in_flight'`.
     - Nếu `commandType == 'emergency_stop'`: Tự động cập nhật `drone.status = 'maintenance'`.
  5. Tạo bản ghi lệnh với `status = 'pending'`, ghi nhận thời điểm `issuedAt`, mô phỏng tiến trình phát và thực thi lệnh qua WebSocket Gateway.
- **Phản hồi thành công**: `201 Created` - Model: `DroneCommandVm`:
  ```json
  {
    "id": "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "droneId": "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "flightId": "f1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "commandType": "rtl",
    "status": "pending",
    "priority": 1,
    "timeoutMs": 3000,
    "issuedBy": "pilot-cuong",
    "issuedAt": "2026-10-10T08:00:00Z"
  }
  ```
- **Phản hồi lỗi**: `400 Bad Request`, `404 Not Found`.

---

### 6.4.7 `GET /api/v1/drones/{droneId}/commands`
Lấy lịch sử các lệnh đã phát cho Drone có phân trang và bộ lọc.

- **Chỉ định role**: Authenticated
- **Input (Query Params)**: `?status=pending&commandType=takeoff&limit=20&offset=0`
- **Phản hồi thành công**: `200 OK` - Model: `DroneCommandListVm`:
  ```json
  {
    "items": [
      {
        "id": "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "droneId": "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "commandType": "takeoff",
        "status": "completed",
        "issuedBy": "pilot-cuong",
        "issuedAt": "2026-10-10T08:00:00Z",
        "completedAt": "2026-10-10T08:00:02Z"
      }
    ],
    "total": 1
  }
  ```

---

### 6.4.8 `GET /api/v1/drones/{droneId}/commands/{commandId}`
Lấy chi tiết trạng thái thực thi và phản hồi của một lệnh.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `DroneCommandVm`.
- **Phản hồi lỗi**: `404 Not Found`.

---

### 6.4.9 `POST /api/v1/drones/{droneId}/commands/{commandId}/cancel`
Hủy bỏ một lệnh đang trong hàng đợi chưa thực thi.

- **Chỉ định role**: `admin, hub_operator, pilot, atc`
- **Ràng buộc nghiệp vụ**: Chỉ cho phép hủy lệnh khi đang ở trạng thái `pending` hoặc `sent`. Nếu lệnh đã bước vào trạng thái `executing` hoặc `completed` $\rightarrow$ Ném `400 Bad Request`.
- **Phản hồi thành công**: `200 OK`: `status` chuyển sang `cancelled`.

---

### 6.4.10 `GET /api/v1/drones/{droneId}/commands/active`
Lấy danh sách các lệnh đang hoạt động trên Drone (chưa kết thúc: `pending`, `sent`, `acknowledged`, `executing`).

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `List<DroneCommandVm>`.

