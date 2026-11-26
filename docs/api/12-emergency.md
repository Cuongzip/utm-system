# 12. MODULE EMERGENCY (Thực thể: `EmergencyIncident`, `EmergencyProtocol`, `BlackboxEntry`, `EmergencyConfig`)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Bộ não an toàn thời gian thực & Hệ thống tự động cứu nạn (Failsafe Brain) cho phương tiện bay không người lái. Tiếp nhận sự cố nguy cấp, tự động tra cứu kịch bản ứng phó, thẩm định khả năng năng lượng, ban hành lệnh cứu nạn (`RTH`, `LAND`, `HOVER`, `DIVERT`, `DESCEND`, `CLIMB`, `ESTOP`), đồng bộ trạng thái giám sát chiến thuật ATC, và kích hoạt hộp đen điện tử tần số cao phục vụ điều tra tai nạn.

---

## 12.1 Cấu Trúc Bảng Dữ Liệu

### 12.1.1 Bảng `emergency_incidents` (Sự cố khẩn cấp)

> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `incident_number` | `varchar(50)` | `string` | **UNIQUE**, NOT NULL | Mã định danh sự cố theo chuẩn ATC (`INC-YYYYMMDD-XXXX`) |
| `drone_id` | `varchar(36)` | `string` | NOT NULL | Phương tiện gặp sự cố |
| `flight_id` | `varchar(36)` | `string` | NULLABLE | Chuyến bay liên đới |
| `protocol_id` | `varchar(36)` | `string` | **FK** -> `emergency_protocols.id` (`ON DELETE SET NULL`), NULLABLE | Kịch bản ứng phó đã khớp |
| `emergency_type` | `varchar(50)` | `EmergencyType` | NOT NULL (DB UPPERCASE) | Loại sự cố an toàn |
| `severity` | `varchar(50)` | `EmergencySeverity` | NOT NULL (DB UPPERCASE) | Mức độ nguy cấp (`warning`, `critical`, `emergency`) |
| `status` | `varchar(50)` | `IncidentStatus` | NOT NULL, Default: `'ACTIVE'` | Trạng thái vòng đời (`active`, `pending_confirmation`, `executing`, `resolved`, `rejected`, `escalated`) |
| `message` | `text` | `string` | NOT NULL | Thông điệp cảnh báo sự cố |
| `detection_data` | `jsonb` | `Record<string, unknown>` | NULLABLE | Dữ liệu đo đạc cảm biến lúc phát hiện |
| `latitude` | `double precision` | `Double` | NULLABLE | Vĩ độ thời điểm phát sinh sự cố |
| `longitude` | `double precision` | `Double` | NULLABLE | Kinh độ thời điểm phát sinh sự cố |
| `altitude` | `double precision` | `Double` | NULLABLE | Cao độ MSL thời điểm phát sinh sự cố (mét) |
| `response_action` | `varchar(50)` | `ResponseAction` | NULLABLE | Hành động can thiệp cứu nạn (`RTH`, `LAND`, `HOVER`, v.v.) |
| `was_auto_executed` | `boolean` | `boolean` | NOT NULL, Default: `false` | Đã tự động kích hoạt hay chờ người phê duyệt |
| `confirmation_required`| `boolean` | `boolean` | NOT NULL, Default: `false` | Có yêu cầu xác nhận của người vận hành |
| `confirmed_by` | `varchar(100)` | `string` | NULLABLE | Định danh người xác nhận hành động |
| `confirmed_at` | `timestamptz` | `ZonedDateTime` | NULLABLE | Thời điểm xác nhận |
| `confirmation_timeout_at`| `timestamptz` | `ZonedDateTime` | NULLABLE | Hạn chót đếm ngược phê duyệt trước khi auto-action |
| `action_started_at` | `timestamptz` | `ZonedDateTime` | NULLABLE | Thời điểm bắt đầu ban hành lệnh khẩn nguy |
| `action_completed_at` | `timestamptz` | `ZonedDateTime` | NULLABLE | Thời điểm hoàn thành hành động can thiệp |
| `action_success` | `boolean` | `Boolean` | NULLABLE | Can thiệp cứu hộ thành công hay thất bại |
| `action_error` | `text` | `string` | NULLABLE | Chi tiết lỗi nếu hành động can thiệp thất bại |
| `resolved_at` | `timestamptz` | `ZonedDateTime` | NULLABLE | Thời điểm giải quyết xong sự cố |
| `resolved_by` | `varchar(100)` | `string` | NULLABLE | Người/Hệ thống đánh dấu giải quyết |
| `resolution_notes` | `text` | `string` | NULLABLE | Ghi chú biện pháp xử lý giải tỏa |
| `root_cause` | `varchar(50)` | `RootCause` | NULLABLE | Kết luận nguyên nhân gốc rễ sau điều tra |
| `root_cause_notes` | `text` | `string` | NULLABLE | Phân tích chi tiết nguyên nhân gốc |
| `lessons_learned` | `text` | `string` | NULLABLE | Bài học rút ra phục vụ phòng ngừa |
| `timeline` | `jsonb` | `IncidentTimelineEventVm[]` | NULLABLE | Chuỗi sự kiện diễn tiến của sự cố |
| `detected_at` | `timestamptz` | `ZonedDateTime` | NOT NULL | Thời điểm hệ thống phát hiện sự cố |
| `version` | `bigint` | — | NOT NULL, Default: `0` | Optimistic Locking (`@Version`) |

---

### 12.1.2 Bảng `emergency_protocols` (Kịch bản ứng phó an toàn)

Quy định ma trận hành động chuẩn (`response_action`, `fallback_action`, `confirmation_timeout_seconds`, `auto_execute_on_timeout`) theo từng cặp duy nhất `(emergency_type, severity)`.

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `varchar(100)` | `string` | NOT NULL, UNIQUE | Tên kịch bản ứng phó |
| `description` | `text` | `string` | NULLABLE | Mô tả chi tiết quy trình |
| `emergency_type` | `varchar(50)` | `EmergencyType` | NOT NULL, UNIQUE với `severity` | Loại sự cố áp dụng |
| `severity` | `varchar(50)` | `EmergencySeverity` | NOT NULL, UNIQUE với `emergency_type` | Cấp độ nguy cấp áp dụng |
| `response_action` | `varchar(50)` | `ResponseAction` | NOT NULL | Hành động can thiệp chính |
| `fallback_action` | `varchar(50)` | `ResponseAction` | NULLABLE | Hành động dự phòng nếu hành động chính bất khả thi |
| `requires_confirmation`| `boolean` | `boolean` | NOT NULL, Default: `true` | Cần người vận hành phê duyệt |
| `confirmation_timeout_seconds` | `int` | `Integer` | NOT NULL, Default: `30` | Thời gian đếm ngược (giây) |
| `auto_execute_on_timeout` | `boolean` | `boolean` | NOT NULL, Default: `true` | Tự động thi hành khi hết hạn đếm ngược |
| `priority` | `int` | `Integer` | NOT NULL, Default: `50` | Mức ưu tiên áp dụng kịch bản |
| `is_active` | `boolean` | `boolean` | NOT NULL, Default: `true` | Kịch bản đang có hiệu lực |
| `is_system_default` | `boolean` | `boolean` | NOT NULL, Default: `false` | Kịch bản mặc định của hệ thống |

---

### 12.1.3 Bảng `blackbox_entries` (Hộp đen chuyến bay)

Ghi nhận bản chụp viễn trắc thời gian thực từ `telemetry` service tại thời điểm thực thi hành động khẩn cấp.

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `flight_id` | `varchar(36)` | `string` | NULLABLE | Chuyến bay liên đới (null nếu sự cố xảy ra ngoài chuyến bay) |
| `drone_id` | `varchar(36)` | `string` | NOT NULL | Drone ghi nhận dữ liệu |
| `incident_id` | `varchar(36)` | `string` | **FK** -> `emergency_incidents.id` (`ON DELETE CASCADE`), NULLABLE | Sự cố khẩn cấp liên quan |
| `timestamp` | `timestamptz` | `ZonedDateTime` | NOT NULL | Dấu thời gian mẫu đo |
| `latitude` | `double precision` | `Double` | NOT NULL | Vĩ độ thời gian thực |
| `longitude` | `double precision` | `Double` | NOT NULL | Kinh độ thời gian thực |
| `altitude_msl` | `double precision` | `Double` | NOT NULL | Độ cao MSL (mét) |
| `ground_speed` | `double precision` | `Double` | NOT NULL | Tốc độ mặt đất (m/s) |
| `heading` | `double precision` | `Double` | NOT NULL | Hướng di chuyển (độ) |
| `battery_level` | `double precision` | `Double` | NOT NULL | Dung lượng pin (%) |
| `signal_strength` | `double precision` | `Double` | NOT NULL | Cường độ tín hiệu C2 link (%) |
| `command_executed` | `varchar(100)` | `string` | NULLABLE | Lệnh thực tế vừa thi hành |
| `emergency_active` | `boolean` | `boolean` | NOT NULL, Default: `false` | Đang trong chế độ khẩn nguy |
| `emergency_type` | `varchar(50)` | `EmergencyType` | NULLABLE | Loại sự cố tại thời điểm lấy mẫu |
| `emergency_severity`| `varchar(50)` | `EmergencySeverity` | NULLABLE | Cấp độ nguy cấp tại thời điểm lấy mẫu |
| `is_emergency_recording` | `boolean` | `boolean` | NOT NULL, Default: `false` | Đánh dấu bản ghi hộp đen khẩn cấp |

---

### 12.1.4 Bảng `emergency_config` (Cấu hình hệ thống khẩn nguy)

Lưu trữ các tham số cấu hình động của Decision Engine và chế độ vận hành (`operation_mode`).

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `varchar(36)` | `string` | **PK**, UUID | Khóa chính bản ghi cấu hình |
| `config_key` | `varchar(100)` | `string` | NOT NULL, UNIQUE | Tên khóa cấu hình (vd: `operation_mode`) |
| `config_value` | `text` | `string` | NOT NULL | Giá trị cấu hình (vd: `"supervised"`) |
| `description` | `text` | `string` | NULLABLE | Mô tả chức năng cấu hình |

---

## 12.2 Các Enum Định Nghĩa

### `EmergencySeverity`
```typescript
export type EmergencySeverity = "warning" | "critical" | "emergency";
```

### `EmergencyType`
```typescript
export type EmergencyType =
  | "battery_low"
  | "battery_critical"
  | "battery_rapid_discharge"
  | "signal_weak"
  | "signal_lost"
  | "geofence_warning"
  | "geofence_breach"
  | "collision_aircraft"
  | "collision_obstacle"
  | "weather_wind"
  | "weather_visibility"
  | "motor_anomaly"
  | "motor_failure"
  | "gps_degraded"
  | "gps_lost";
```

### `IncidentStatus`
```typescript
export type IncidentStatus =
  | "active"
  | "pending_confirmation"
  | "executing"
  | "resolved"
  | "rejected"
  | "escalated";
```

### `OperationMode`
```typescript
export type OperationMode = "auto" | "supervised";
```

### `ResponseAction`
```typescript
export type ResponseAction =
  | "RTH"
  | "LAND"
  | "HOVER"
  | "DIVERT"
  | "DESCEND"
  | "CLIMB"
  | "ESTOP"
  | "NONE";
```

### `RootCause`
```typescript
export type RootCause =
  | "equipment"
  | "weather"
  | "pilot_error"
  | "software"
  | "external"
  | "unknown";
```

---

## 12.3 Giao Thức STOMP WebSocket

- **WebSocket Endpoint**: `/ws` (hỗ trợ SockJS fallback tại `/ws`).
- **Application Destination Prefix**: `/app`
- **Broker Prefix**: `/topic`
- **Kênh phát sóng (Broadcast Topics)**:
  - `/topic/emergency/incidents`: Toàn bộ sự cố khẩn cấp khi được tạo mới, cập nhật nguyên nhân hoặc chuyển trạng thái vòng đời.
  - `/topic/emergency/drone/{droneId}`: Sự cố liên đới tới drone cụ thể.
  - `/topic/emergency/flight/{flightId}`: Sự cố liên đới tới chuyến bay cụ thể.
  - `/topic/emergency/pending`: Sự cố chuyển vào hàng đợi đếm ngược chờ người vận hành phê duyệt hành động cứu nạn.
  - `/topic/emergency/confirmed`: Sự kiện phê duyệt hoặc hết hạn thời gian chờ xác nhận (`approved`, `timeout`, `action`).
  - `/topic/emergency/mode`: Thông báo thay đổi chế độ vận hành của hệ thống (`auto` $\leftrightarrow$ `supervised`).
  - `/topic/emergency/notifications`: Kênh thông báo khẩn cấp hợp nhất cho trung tâm chỉ huy (`EmergencyNotificationVm`).
  - `/topic/emergency/blackbox/{incidentId}`: Luồng dữ liệu hộp đen viễn trắc tần số cao truyền trực tiếp khi sự cố đang diễn ra.
- **Kafka Event Integration**:
  - Tiêu thụ `utm.telemetry.live` để phát hiện tự động đa cảm biến (pin `<=5%/<=10%/<=25%` + tốc độ xả bất thường, tín hiệu `<20%/<50%`, GPS `hdop > 5.0/2.0` hoặc `satellites < 4/6`).
  - Phát sự kiện trạng thái khẩn nguy lên `utm.emergency.events` (để `connectivity` tự động nâng tần số viễn trắc lên `EMERGENCY: 10Hz`) và phát lệnh cứu nạn ưu tiên `P0` trực tiếp lên `utm.drone.commands`.

---

## 12.4 Chi Tiết Từng Endpoint

### 12.4.1 `POST /api/v1/emergency/incidents`
Khai báo sự cố an toàn bay khẩn cấp từ các hệ thống giám sát tự động (Watchdog, Conformance Checker, Telemetry Stream) hoặc từ phi công/kiểm soát viên.

- **Chỉ định role**: `admin, atc, pilot, operator`
- **Input (Request Body)** - Model: `EmergencyIncidentPostVm`:
  ```json
  {
    "incidentNumber": "INC-20261107-A1B2",
    "droneId": "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "flightId": "f1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "emergencyType": "battery_critical",
    "severity": "critical",
    "message": "Critical battery level reached: 9.8%",
    "detectionData": "{\"batteryPct\": 9.8, \"voltageV\": 21.2}",
    "latitude": 10.762622,
    "longitude": 106.660172,
    "altitude": 115.5
  }
  ```
  *(Lưu ý: `incidentNumber` là tùy chọn; nếu để trống hoặc null, hệ thống sẽ tự động sinh mã duy nhất theo mẫu `INC-YYYYMMDD-XXXX` qua `BusinessCodeGenerator`).*
- **Logic xử lý cốt lõi**:
  1. Kiểm tra mã định danh sự cố: Nếu truyền vào thì chuẩn hóa và kiểm tra trùng lặp (`INCIDENT_NUMBER_ALREADY_EXISTED`); nếu không truyền, tự động sinh mã ngẫu nhiên duy nhất định dạng `INC-YYYYMMDD-XXXX`.
  2. Map dữ liệu sang `EmergencyIncident entity`.
  3. Gán trạng thái ban đầu dựa vào chế độ vận hành: Nếu `OperationMode == supervised` thì gán `pending_confirmation`, ngược lại gán `active`.
  4. Gán `createdBy` từ JWT Subject hoặc mặc định `"system"`.
  5. Lưu bản ghi vào bảng `emergency_incidents`.
  6. Chuyển giao sang `DecisionEngineService.processEmergency(saved)` để tra cứu kịch bản và quyết định hành động cứu nạn.
  7. Phát sóng WebSocket tới `/topic/emergency/incidents`, `/topic/emergency/drone/{droneId}`, `/topic/emergency/flight/{flightId}`.
- **Phản hồi thành công**: `201 Created` - Model: `EmergencyIncidentVm`.

---

### 12.4.2 `GET /api/v1/emergency/incidents`
Tìm kiếm và lọc danh sách sự cố khẩn cấp có phân trang theo nhiều tiêu chí.

- **Chỉ định role**: Authenticated
- **Input (Query Params)**:
  - `status` (string, optional): Lọc theo trạng thái (hỗ trợ phân tách bằng dấu phẩy, vd: `active,executing`).
  - `severity` (EmergencySeverity, optional): `warning`, `critical`, `emergency`.
  - `type` (EmergencyType, optional): Mã loại sự cố.
  - `droneId` (string, optional): UUID của drone.
  - `from` (ISO 8601, optional): Lọc từ thời điểm phát hiện.
  - `to` (ISO 8601, optional): Lọc đến thời điểm phát hiện.
  - `limit` (int, default `50`): Số lượng bản ghi mỗi trang.
  - `offset` (int, default `0`): Vị trí bắt đầu bản ghi.
- **Phản hồi thành công**: `200 OK` - Model: `IncidentPageVm`.

---

### 12.4.3 `GET /api/v1/emergency/incidents/active`
Lấy danh sách các sự cố đang diễn ra cần giám sát trực tiếp trên radar (`status` thuộc `active`, `pending_confirmation`, `executing`).

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `List<EmergencyIncidentVm>`.

---

### 12.4.4 `GET /api/v1/emergency/incidents/pending`
Lấy danh sách các sự cố hiện đang nằm trong hàng đợi đếm ngược chờ người vận hành phê duyệt hành động can thiệp.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `List<PendingConfirmationVm>`.

---

### 12.4.5 `GET /api/v1/emergency/incidents/{id}`
Lấy chi tiết sự cố khẩn cấp cùng dòng thời gian diễn tiến sự kiện (`timeline`). Tham số `{id}` hỗ trợ cả UUID bản ghi (`id`) hoặc mã định danh nghiệp vụ sự cố (`incidentNumber`, vd: `INC-20261107-A1B2`).

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `EmergencyIncidentVm`.
- **Lỗi nghiệp vụ**: `404 Not Found` nếu không tìm thấy sự cố.

---

### 12.4.6 `POST /api/v1/emergency/incidents/{id}/confirm`
Người vận hành (ATC / Phi công / Quản trị viên) phê chuẩn (`approved: true`) hoặc từ chối (`approved: false`) hành động can thiệp được Decision Engine đề xuất trước khi hết hạn đếm ngược.

- **Chỉ định role**: `pilot, atc, admin`
- **Input (Request Body)** - Model: `ConfirmIncidentVm`:
  ```json
  {
    "approved": true
  }
  ```
- **Xử lý**:
  1. Hủy bỏ timer đếm ngược trong DecisionEngine.
  2. Nếu phê chuẩn (`approved: true`): Chuyển trạng thái sang `executing`, kích hoạt `ResponseExecutorService.executeResponse(...)` phát lệnh can thiệp.
  3. Nếu từ chối (`approved: false`): Chuyển trạng thái sang `rejected` (tách biệt khỏi `resolved`), tự động giải tỏa các Alert liên kết.
  4. Cập nhật `confirmed_by`, `confirmed_at`.
  5. Phát sóng sự kiện qua `/topic/emergency/confirmed` và `/topic/emergency/incidents`.
- **Phản hồi thành công**: `200 OK` - Model: `EmergencyIncidentVm`.

---

### 12.4.6b `POST /api/v1/emergency/incidents/{id}/resolve`
Đóng thủ công một sự cố khẩn cấp đang mở (`active`, `pending_confirmation`, `executing`, hoặc `escalated`, bao gồm sự cố không gắn `flight_id`).

- **Chỉ định role**: `pilot, atc, admin`
- **Input (Request Body, optional)** - Model: `ResolveIncidentVm`:
  ```json
  {
    "resolutionNotes": "Drone safely landed and cleared by ATC"
  }
  ```
- **Xử lý**: Hủy timer chờ xác nhận (nếu có), chuyển `status = resolved`, phát sóng WebSocket và tự động đóng các Alert liên kết.
- **Phản hồi thành công**: `200 OK` - Model: `EmergencyIncidentVm`.
- **Lỗi nghiệp vụ**: `400 Bad Request` (`EMERGENCY_INCIDENT_ALREADY_RESOLVED`) nếu sự cố đã đóng; `404 Not Found`.

---

### 12.4.7 `PUT /api/v1/emergency/incidents/{id}/root-cause`
Cập nhật kết luận điều tra nguyên nhân gốc rễ và bài học kinh nghiệm sau sự cố.

- **Chỉ định role**: `atc, admin`
- **Input (Request Body)** - Model: `RootCauseVm`:
  ```json
  {
    "rootCause": "equipment",
    "rootCauseNotes": "Cell 3 voltage sudden drop due to manufacturing defect",
    "lessonsLearned": "Mandate pre-flight battery internal resistance telemetry check"
  }
  ```
- **Phản hồi thành công**: `200 OK` - Model: `EmergencyIncidentVm`.

---

### 12.4.8 `GET /api/v1/emergency/incidents/{id}/blackbox`
Trích xuất toàn bộ dữ liệu hộp đen viễn trắc tần số cao được ghi nhận trong thời gian diễn ra sự cố.

- **Chỉ định role**: Authenticated
- **Input (Query Params)**: `from`, `to` (ISO 8601, optional).
- **Phản hồi thành công**: `200 OK` - Model: `List<BlackboxEntryVm>`.

---

### 12.4.9 `GET /api/v1/emergency/blackbox/flight/{flightId}`
Truy vấn luồng dữ liệu hộp đen của một chuyến bay cụ thể.

- **Chỉ định role**: Authenticated
- **Input (Query Params)**: `from`, `to` (optional), `limit` (default `1000`).
- **Phản hồi thành công**: `200 OK` - Model: `List<BlackboxEntryVm>`.

---

### 12.4.10 `GET /api/v1/emergency/protocols`
Lấy danh sách các kịch bản ứng phó an toàn khẩn nguy.

- **Chỉ định role**: Authenticated
- **Input (Query Params)**: `active` (boolean, optional): Lọc theo trạng thái hiệu lực.
- **Phản hồi thành công**: `200 OK` - Model: `List<EmergencyProtocolVm>`.

---

### 12.4.11 `GET /api/v1/emergency/protocols/{id}`
Lấy chi tiết một kịch bản ứng phó an toàn theo UUID.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `EmergencyProtocolVm`.

---

### 12.4.12 `POST /api/v1/emergency/protocols`
Tạo mới một kịch bản ứng phó khẩn nguy tùy chỉnh.

- **Chỉ định role**: `admin, atc`
- **Input (Request Body)** - Model: `EmergencyProtocolPostVm`.
- **Phản hồi thành công**: `201 Created` - Model: `EmergencyProtocolVm`.

---

### 12.4.13 `PUT /api/v1/emergency/protocols/{id}`
Cập nhật tham số của một kịch bản ứng phó an toàn hiện có.

- **Chỉ định role**: `admin, atc`
- **Input (Request Body)** - Model: `EmergencyProtocolPutVm`.
- **Phản hồi thành công**: `200 OK` - Model: `EmergencyProtocolVm`.

---

### 12.4.14 `GET /api/v1/emergency/config`
Lấy thông tin cấu hình khẩn nguy runtime và chế độ vận hành hiện tại.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `EmergencySystemConfigVm`.

---

### 12.4.15 `PUT /api/v1/emergency/config/mode`
Chuyển đổi chế độ vận hành của Decision Engine (`auto` $\leftrightarrow$ `supervised`).

- **Chỉ định role**: `admin, atc`
- **Input (Request Body)** - Model: `OperationModeVm`:
  ```json
  {
    "mode": "auto"
  }
  ```
- **Phản hồi thành công**: `200 OK` - Model: `OperationModeVm`.

---

### 12.4.16 `PUT /api/v1/emergency/config/{key}`
Cập nhật giá trị cấu hình động theo khóa.

- **Chỉ định role**: `admin, atc`
- **Input (Request Body)** - Model: `ConfigValueVm`.
- **Phản hồi thành công**: `200 OK` - Model: `EmergencyConfigVm`.

---

### 12.4.17 `GET /api/v1/emergency/stats`
Tổng hợp số liệu thống kê an toàn và phân bố sự cố theo trạng thái, mức độ nguy cấp, loại sự cố, và tỷ lệ giải quyết.

- **Chỉ định role**: Authenticated
- **Input (Query Params)**: `from`, `to` (ISO 8601, optional).
- **Phản hồi thành công**: `200 OK` - Model: `EmergencyStatsVm`.

---

### 12.4.18 `GET /api/v1/emergency/stats/trends`
Truy vấn xu hướng chuỗi thời gian của các sự cố an toàn bay.

- **Chỉ định role**: Authenticated
- **Input (Query Params)**: `from`, `to` (ISO 8601, optional), `interval` (`day`, `week`, `month`, default `'day'`).
- **Phản hồi thành công**: `200 OK` - Model: `List<EmergencyTrendVm>`.
