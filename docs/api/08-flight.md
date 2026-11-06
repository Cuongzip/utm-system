# 08. MODULE FLIGHT & FEASIBILITY (Thực thể: `Flight`, `FlightConformance`, `FeasibilityEvaluation`)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Trọng tâm vận hành của hệ thống UTM: Chuyển đổi từ Kế hoạch nhiệm vụ sang Chuyến bay thực tế được kiểm soát không lưu, quản lý toàn bộ vòng đời chuyến bay (Phê duyệt ATC, Khởi hành, Giám sát hành trình, Hoàn thành, Hủy khẩn cấp/Hạ cánh khẩn cấp), giám sát sai số hành lang 4D thời gian thực (4D Conformance Monitoring); đồng thời tích hợp bộ đánh giá tính khả thi trước chuyến bay (Pre-flight Feasibility Check), tính toán mô hình tiêu thụ năng lượng vật lý dựa trên dung lượng pin, thời tiết khí tượng thực tế (sức cản của gió) và tải trọng hàng hóa để đưa ra phán quyết bay (Go / Marginal / No-Go).

---

## 8.1 Cấu Trúc Bảng Dữ Liệu

### Bảng `flight`
> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `flight_number` | `varchar(100)` | `string` | NOT NULL, **UNIQUE** | Mã số hiệu chuyến bay (vd: `FL-2026-001`) |
| `drone_id` | `varchar(36)` | `string` | **FK** -> `drone.id`, NOT NULL | Phương tiện bay thực hiện |
| `departure_hub_id` | `varchar(36)` | `string` | **FK** -> `hub.id`, NOT NULL | Trạm cất cánh |
| `arrival_hub_id` | `varchar(36)` | `string` | **FK** -> `hub.id`, NOT NULL | Trạm hạ cánh |
| `pilot_id` | `varchar(100)` | `string` | NULLABLE | Phi công phụ trách giám sát |
| `scheduled_departure` | `timestamptz` | `string (ISO 8601)` | NOT NULL | Thời điểm dự kiến cất cánh |
| `scheduled_arrival` | `timestamptz` | `string (ISO 8601)` | NOT NULL | Thời điểm dự kiến hạ cánh |
| `actual_departure` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm cất cánh thực tế |
| `actual_arrival` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm hạ cánh thực tế |
| `cruising_altitude_m` | `double precision` | `number` | NULLABLE | Độ cao bay hành trình (mét) |
| `execution_id` | `varchar(36)` | `string` | **FK** -> `mission_execution.id`, NULLABLE | Liên kết với lần thực thi nhiệm vụ |
| `planned_route` | `text` | `GeoJSON.LineString` | NOT NULL | Tuyến đường bay kế hoạch 4D |
| `actual_route` | `text` | `GeoJSON.LineString` | NOT NULL, Default: `'{"type":"LineString","coordinates":[]}'` | Quỹ đạo bay thực tế từ telemetry |
| `authorization_status` | `varchar(50)` | `FlightAuthorizationStatus` | NOT NULL, Default: `'PENDING'` | Trạng thái phê duyệt của ATC |
| `conformance_status` | `varchar(50)` | `ConformanceStatus` | NOT NULL, Default: `'CONFORMING'` | Mức độ tuân thủ hành lang bay |
| `status` | `varchar(50)` | `FlightStatus` | NOT NULL, Default: `'SCHEDULED'` | Trạng thái vận hành chuyến bay |
| `feasibility_verdict` | `varchar(20)` | `Verdict` | NOT NULL, Default: `'UNKNOWN'` | Phán quyết khả thi pin & thời tiết |
| `feasibility_override` | `text` | `string` | NULLABLE | Ghi chú lý do cấp quyền ngoại lệ bay |
| `notes` | `text` | `string` | NULLABLE | Ghi chú vận hành / lý do từ chối, hủy chuyến |

---

### Bảng `flight_conformance` (Giám sát hành lang 4D)
> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `flight_id` | `varchar(36)` | `string` | **FK** -> `flight.id`, NOT NULL, **UNIQUE** | Chuyến bay được theo dõi (1-1) |
| `status` | `varchar(30)` | `ConformanceStatus` | NOT NULL, Default: `'UNKNOWN'` | Trạng thái tuân thủ tức thời |
| `cross_track_error_m` | `double precision` | `number` | NULLABLE | Độ lệch ngang so với tâm hành lang (mét) |
| `vertical_error_m` | `double precision` | `number` | NULLABLE | Độ lệch cao độ so với kế hoạch (mét) |
| `corridor_radius_m` | `double precision` | `number` | NOT NULL, Default: `15.0` | Bán kính hành lang an toàn cho phép (mét) |
| `altitude_buffer_m` | `double precision` | `number` | NOT NULL, Default: `10.0` | Vùng đệm cao độ cho phép (mét) |
| `current_latitude` | `double precision` | `number` | NULLABLE | Vĩ độ hiện tại của Drone |
| `current_longitude` | `double precision` | `number` | NULLABLE | Kinh độ hiện tại của Drone |
| `current_altitude` | `double precision` | `number` | NULLABLE | Cao độ hiện tại của Drone (mét) |
| `current_speed` | `double precision` | `number` | NULLABLE | Vận tốc mặt đất hiện tại (m/s) |
| `current_heading` | `double precision` | `number` | NULLABLE | Hướng mũi bay hiện tại (độ 0 - 360) |
| `last_telemetry_time` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm gói telemetry gần nhất |
| `last_evaluated_at` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm đánh giá conformance gần nhất |
| `violations_json` | `text` | `string / JSON` | NULLABLE | Chi tiết vi phạm hành lang dạng JSON |

---

### Bảng `feasibility_evaluations` (Thẩm định khả thi năng lượng)
> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `flight_id` | `varchar(36)` | `string` | **FK** -> `flight.id`, NOT NULL | Chuyến bay được thẩm định |
| `drone_id` | `varchar(36)` | `string` | **FK** -> `drone.id`, NOT NULL | Drone dự kiến thực hiện bay |
| `verdict` | `varchar(20)` | `Verdict` | NOT NULL | Phán quyết khả thi (`GO`, `MARGINAL`, `NO_GO`, `UNKNOWN`) |
| `margin_pct` | `double precision` | `number` | NOT NULL | Tỷ lệ pin dự trữ an toàn dôi dư (%) |
| `usable_wh` | `double precision` | `number` | NOT NULL | Năng lượng pin khả dụng (Wh) |
| `required_wh` | `double precision` | `number` | NOT NULL | Tổng năng lượng ước tính tiêu thụ (Wh) |
| `cruise_wh` | `double precision` | `number` | NOT NULL | Năng lượng bay hành trình (Wh) |
| `hover_wh` | `double precision` | `number` | NOT NULL | Năng lượng bay treo (Wh) |
| `climb_wh` | `double precision` | `number` | NOT NULL | Năng lượng leo dốc / nâng cao độ (Wh) |
| `payload_factor` | `double precision` | `number` | NOT NULL | Hệ số tải trọng hàng hóa |
| `wind_factor` | `double precision` | `number` | NOT NULL | Hệ số cản gió |
| `wind_speed_ms` | `double precision` | `number` | NULLABLE | Vận tốc gió sử dụng tính toán (m/s) |
| `confidence` | `varchar(20)` | `string` | NOT NULL | Mức độ tin cậy của thuật toán |
| `solutions_json` | `text` | `string / JSON` | NULLABLE | Các giải pháp gợi ý khi kết quả là NO_GO |
| `explanation` | `text` | `string` | NULLABLE | Giải trình chi tiết của mô hình vật lý |
| `explanation_source` | `varchar(20)` | `string` | NOT NULL, Default: `'deterministic'` | Nguồn giải trình (`deterministic` / `llm`) |

---

## 8.2 Các Enum Định Nghĩa

```typescript
export type FlightStatus =
  | "PLANNED"           // Đang lập kế hoạch ban đầu
  | "SCHEDULED"         // Đã xếp lịch, chờ duyệt ATC và thẩm định an toàn
  | "AUTHORIZED"        // Đã được ATC cấp phép bay, sẵn sàng cất cánh
  | "ACTIVE"            // Đang bay trên không (In-flight)
  | "COMPLETED"         // Đã hạ cánh an toàn tại đích
  | "CANCELLED"         // Đã hủy trước khi cất cánh hoặc bị từ chối
  | "DIVERTED"          // Đang chuyển hướng sang bãi đáp dự phòng
  | "EMERGENCY_LANDING";// Kích hoạt hạ cánh khẩn cấp do sự cố

export type FlightAuthorizationStatus =
  | "PENDING"   // Chờ kiểm soát viên ATC xem xét
  | "APPROVED"  // Đã được ATC chấp thuận
  | "REJECTED"; // Bị ATC từ chối

export type ConformanceStatus =
  | "CONFORMANT"     // Bay đúng tâm hành lang và trần bay
  | "CONFORMING"     // Tuân thủ bình thường trong hành lang
  | "NON_CONFORMING" // Lệch vượt ngưỡng đệm hành lang (> 15m ngang / > 10m dọc) hoặc mất tín hiệu > 30s
  | "CONTINGENT"     // Mất kiểm soát nghiêm trọng / mất tín hiệu > 90s, kích hoạt cứu hộ khẩn cấp
  | "UNKNOWN";       // Chưa có dữ liệu viễn trắc

export type Verdict =
  | "GO"        // Đạt chuẩn an toàn (Dự trữ pin > 25%, gió dưới ngưỡng) -> Đủ điều kiện duyệt bay
  | "MARGINAL"  // Ngấp nghé ranh giới an toàn (Dự trữ 15 - 25%) -> Cần phi công/ATC xem xét
  | "NO_GO"     // Không an toàn (Pin thiếu hụt hoặc gió vượt dung sai) -> Chặn cất cánh trừ khi có override
  | "UNKNOWN";  // Chưa thẩm định
```

---

## 8.3 Mối Quan Hệ Liên Kết (Relationships)

- **`Drone` (N - 1)**: Phương tiện bay thực hiện chuyến bay (`flight.drone_id -> drone.id`).
- **`Hub` (N - 1)**: Trạm cất cánh (`departure_hub_id`) và trạm hạ cánh (`arrival_hub_id`).
- **`MissionExecution` (N - 1)**: Chuyến bay được tạo từ một đợt thực thi nhiệm vụ (`flight.execution_id -> mission_execution.id`).
- **`FlightConformance` (1 - 1)**: Bảng giám sát hành lang bay 4D độc lập cho chuyến bay (`flight.id <-> flight_conformance.flight_id`).
- **`FeasibilityEvaluation` (1 - N)**: Lịch sử các lần thẩm định năng lượng trước và trong chuyến bay (`flight.id <- feasibility_evaluations.flight_id`).
- **`ConflictService` & `EmergencyService` (Inter-service)**: Khi phát hiện vi phạm hành lang (`NON_CONFORMING`), tự động gọi Conflict Service để cảnh báo; khi chuyển sang `CONTINGENT`, tự động gọi Emergency Service để kích hoạt cứu hộ.

---

## 8.4 Chi Tiết Từng Endpoint

### 8.4.1 Nhóm Quản Lý Chuyến Bay (Flights & Flight Plans)

#### `GET /api/v1/flights`
Lấy danh sách các chuyến bay có phân trang và bộ lọc linh hoạt.

- **Chỉ định role**: Authenticated
- **Input (Query Params)**:
  - `status`: Lọc theo trạng thái chuyến bay (`planned`, `scheduled`, `authorized`, `active`, `completed`, `cancelled`, `diverted`, `emergency_landing`).
  - `authorizationStatus`: Lọc theo trạng thái duyệt (`pending`, `approved`, `rejected`).
  - `pilotId`: Lọc theo phi công phụ trách.
  - `droneId`: Lọc theo Drone thực hiện.
  - `limit`: Kích thước trang (mặc định: `20`, $\le 0$ để lấy toàn bộ không phân trang).
  - `offset`: Vị trí bản ghi bắt đầu (mặc định: `0`).
- **Phản hồi thành công**: `200 OK` - Model: `FlightListVm`.

---

#### `POST /api/v1/flights`
Tạo mới một hồ sơ kế hoạch chuyến bay.

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Input (Request Body)** - Model: `FlightPostVm`:
  ```json
  {
    "flightNumber": "FL-2026-001",
    "droneId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "departureHubId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "arrivalHubId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "pilotId": "PILOT-VN-007",
    "scheduledDeparture": "2026-10-01T08:00:00Z",
    "scheduledArrival": "2026-10-01T08:45:00Z",
    "cruisingAltitudeM": 120.0,
    "notes": "Medical parcel delivery via Corridor Bravo",
    "executionId": "550e8400-e29b-41d4-a716-446655440000",
    "plannedRoute": {
      "type": "LineString",
      "coordinates": [
        [106.7009, 10.7769, 50.0],
        [106.6800, 10.7600, 120.0],
        [106.6598, 10.7554, 30.0]
      ]
    }
  }
  ```
- **Logic xử lý cốt lõi**:
  1. Kiểm tra tính duy nhất của `flightNumber` $\rightarrow$ nếu trùng ném `409 Conflict` (`FLIGHT_NUMBER_ALREADY_EXISTED`).
  2. Kiểm tra Drone tồn tại qua `DroneClientService` $\rightarrow$ nếu không tìm thấy ném `404 Not Found`.
  3. Kiểm tra Hub đi và đến qua `HubClientService` $\rightarrow$ nếu không tìm thấy ném `404 Not Found`.
  4. Nếu không cung cấp `plannedRoute`, tự động tạo tuyến đường thẳng mặc định giữa 2 Hub.
  5. Khởi tạo `status = SCHEDULED`, `authorizationStatus = PENDING`, `conformanceStatus = CONFORMANT`.
- **Phản hồi thành công**: `201 Created` - Model: `FlightVm`.

---

#### `GET /api/v1/flights/{id}`
Lấy thông tin chi tiết một chuyến bay kèm trạng thái duyệt ATC, tuyến đường kế hoạch/thực tế và phán quyết khả thi.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `FlightVm`.
- **Phản hồi lỗi**: `404 Not Found` (`FLIGHT_NOT_FOUND`).

---

#### `PUT /api/v1/flights/{id}`
Cập nhật thông số chuyến bay khi chưa cất cánh.

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Ràng buộc nghiệp vụ**:
  - Không cho phép chỉnh sửa khi chuyến bay ở trạng thái `ACTIVE`, `COMPLETED`, `CANCELLED`, `EMERGENCY_LANDING`, hoặc `DIVERTED` $\rightarrow$ `400 Bad Request`.
  - Nếu chuyến bay trước đó đã được ATC duyệt (`status == AUTHORIZED`), việc sửa đổi sẽ **tự động reset** trạng thái về `status = SCHEDULED` và `authorizationStatus = PENDING` để ATC phê duyệt lại.
- **Input (Request Body)** - Model: `FlightPutVm`.
- **Phản hồi thành công**: `200 OK` - Model: `FlightVm`.

---

#### `POST /api/v1/flights/{id}/authorize`
Không lưu ATC phê duyệt cấp phép bay.

- **Chỉ định role**: `atc, admin`
- **Ràng buộc an toàn bay (Safety Guard)**:
  - Chỉ cho phép duyệt chuyến bay đang ở trạng thái `PLANNED` hoặc `SCHEDULED` và có `authorizationStatus == PENDING`.
  - Nếu chuyến bay có kết quả thẩm định năng lượng là `NO_GO` và chưa có ghi chú ngoại lệ (`feasibilityOverride`) $\rightarrow$ Nghiêm cấm ATC phê duyệt bay $\rightarrow$ Ném `400 Bad Request`.
- **Side-effects**: Cập nhật `authorizationStatus = APPROVED`, `status = AUTHORIZED`.
- **Phản hồi thành công**: `200 OK` - Model: `FlightVm`.

---

#### `POST /api/v1/flights/{id}/reject`
Không lưu ATC từ chối cấp phép bay kèm lý do.

- **Chỉ định role**: `atc, admin`
- **Input (Request Body)** - Model: `FlightRejectVm`:
  ```json
  {
    "reason": "Airspace closed due to extreme weather storm"
  }
  ```
- **Side-effects**: Cập nhật `authorizationStatus = REJECTED`, `status = CANCELLED`, lưu lý do từ chối vào `notes`.
- **Phản hồi thành công**: `200 OK` - Model: `FlightVm`.

---

#### `POST /api/v1/flights/{id}/start`
Kích hoạt cất cánh và chuyển trạng thái chuyến bay sang đang hoạt động (`ACTIVE`).

- **Chỉ định role**: `pilot, hub_operator, admin`
- **Ràng buộc an toàn bay**:
  - Chuyến bay bắt buộc phải có `status == AUTHORIZED` và `authorizationStatus == APPROVED`.
- **Side-effects**: Cập nhật `status = ACTIVE`, gán `actualDeparture = now()`.
- **Phản hồi thành công**: `200 OK` - Model: `FlightVm`.

---

#### `POST /api/v1/flights/{id}/complete`
Xác nhận chuyến bay đã hạ cánh thành công tại bãi đáp đích.

- **Chỉ định role**: `pilot, hub_operator, admin`
- **Ràng buộc**: Chuyến bay bắt buộc phải ở trạng thái `ACTIVE`.
- **Side-effects**: Cập nhật `status = COMPLETED`, gán `actualArrival = now()`.
- **Phản hồi thành công**: `200 OK` - Model: `FlightVm`.

---

#### `POST /api/v1/flights/{id}/abort`
Hủy chuyến bay hoặc kích hoạt quy trình hạ cánh khẩn cấp.

- **Chỉ định role**: `admin, hub_operator, pilot, atc`
- **Input (Request Body)** - Model: `FlightAbortVm`:
  ```json
  {
    "reason": "Critical battery degradation / motor failure"
  }
  ```
- **Logic chuyển trạng thái thông minh**:
  - Nếu chuyến bay chưa bay (tiền hành trình) $\rightarrow$ chuyển `status = CANCELLED`.
  - Nếu chuyến bay đang trên không (`ACTIVE` hoặc `DIVERTED`) $\rightarrow$ chuyển `status = EMERGENCY_LANDING`.
  - Nghiêm cấm hủy nếu chuyến bay đã `COMPLETED`, `CANCELLED` hoặc đang `EMERGENCY_LANDING`.
  - Ghi nhận lý do hủy/sự cố vào `notes`.
- **Phản hồi thành công**: `200 OK` - Model: `FlightVm`.

---

### 8.4.2 Nhóm Giám Sát Tuân Thủ Hành Lang 4D (Flight Conformance)

#### `GET /api/v1/flights/{flightId}/conformance`
Lấy trạng thái giám sát tuân thủ hành lang 4D hiện tại của chuyến bay.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `FlightConformanceVm`:
  ```json
  {
    "flightId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "conforming",
    "crossTrackErrorM": 3.2,
    "verticalErrorM": 1.5,
    "corridorRadiusM": 15.0,
    "altitudeBufferM": 10.0,
    "currentLatitude": 10.7772,
    "currentLongitude": 106.7011,
    "currentAltitude": 51.5,
    "currentSpeed": 14.8,
    "currentHeading": 85.0,
    "lastTelemetryTime": "2026-10-01T08:15:30Z",
    "lastEvaluatedAt": "2026-10-01T08:15:35Z"
  }
  ```

---

#### `POST /api/v1/flights/{flightId}/conformance/evaluate`
Kích hoạt đánh giá tức thời mức độ tuân thủ hành lang 4D từ gói dữ liệu viễn trắc telemetry mới nhất của Drone.

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Logic đánh giá**:
  - Truy vấn telemetry mới nhất qua `TelemetryClientService`.
  - Tính toán sai số vuông góc ngang (`crossTrackErrorM`) và sai số cao độ (`verticalErrorM`) so với Polyline kế hoạch.
  - Phân loại trạng thái: `CONFORMANT`, `NON_CONFORMING` (lệch ngang > 15m / dọc > 10m hoặc telemetry trễ > 30s), `CONTINGENT` (mất tín hiệu > 90s).
  - Tự động gọi `ConflictClientService` khi `NON_CONFORMING` và gọi `EmergencyClientService` khi `CONTINGENT`.
- **Phản hồi thành công**: `200 OK` - Model: `FlightConformanceVm`.

---

### 8.4.3 Nhóm Thẩm Định Khả Thi Năng Lượng & Phán Quyết Bay (Flight Feasibility)

#### `POST /api/v1/flights/{flightId}/feasibility/check`
Thực hiện thẩm định tính khả thi năng lượng vật lý trước chuyến bay bằng mô hình xác định (Deterministic Physics Model).

- **Chỉ định role**: `pilot, hub_operator, atc, admin`
- **Input (Request Body)** - Model: `FeasibilityCheckPostVm`:
  ```json
  {
    "payloadKg": 1.5,
    "distanceM": 5200.0,
    "hoverTimeS": 60.0,
    "weatherOverride": {
      "windSpeedMs": 4.5
    }
  }
  ```
- **Logic xử lý cốt lõi**:
  1. Lấy thông số kỹ thuật năng lượng của Drone qua `DroneClientService.getDroneEnergySpec`.
  2. Tính toán khoảng cách tuyến đường từ GeoJSON `plannedRoute` (nếu không cung cấp override `distanceM`).
  3. Mô hình vật lý `EnergyModelService` tính toán $E_{total} = (E_{climb} + E_{cruise} + E_{hover}) \times K_{payload} \times K_{wind}$.
  4. Đưa ra phán quyết `verdict`:
     - Tỷ lệ pin dôi dư `marginPct` > 25% $\rightarrow$ **`GO`**.
     - Tỷ lệ pin dôi dư 15% - 25% $\rightarrow$ **`MARGINAL`**.
     - Tỷ lệ pin dôi dư < 15% hoặc gió vượt ngưỡng $\rightarrow$ **`NO_GO`**.
  5. Lưu bản ghi vào bảng `feasibility_evaluations` và cập nhật `flight.feasibility_verdict`.
- **Phản hồi thành công**: `200 OK` - Model: `FeasibilityResultVm`.

---

#### `POST /api/v1/flights/{flightId}/feasibility/override`
Cấp quyền ngoại lệ bay khi kết quả thẩm định năng lượng là `MARGINAL` hoặc `NO_GO`.

- **Chỉ định role**: `atc, admin`
- **Input (Request Body)** - Model: `FeasibilityOverridePostVm`:
  ```json
  {
    "reason": "Emergency medical delivery authorized with active battery monitoring",
    "approvedBy": "atc-controller-01"
  }
  ```
- **Ràng buộc & Side-effects**:
  - Không cho phép cấp ngoại lệ khi chuyến bay đã cất cánh hoặc hoàn tất (`ACTIVE`, `COMPLETED`, `CANCELLED`, `EMERGENCY_LANDING`, `DIVERTED`).
  - Ghi nhận `flight.feasibilityOverride = "Override by {approvedBy}: {reason}"`.
  - Nếu chuyến bay đang ở trạng thái `authorizationStatus == PENDING`, tự động chuyển sang `status = AUTHORIZED` và `authorizationStatus = APPROVED`.
- **Phản hồi thành công**: `200 OK` - Model: `FlightVm`.

---

#### `GET /api/v1/flights/feasibility/history` (Alias: `GET /api/v1/feasibility/history`)
Lấy danh sách lịch sử toàn bộ các lần thẩm định khả thi năng lượng có phân trang và bộ lọc.

- **Chỉ định role**: Authenticated
- **Input (Query Params)**:
  - `flightId`: Lọc theo UUID chuyến bay.
  - `droneId`: Lọc theo UUID Drone.
  - `limit`: Kích thước trang (mặc định: `20`, $\le 0$ để lấy toàn bộ).
  - `offset`: Vị trí bản ghi bắt đầu (mặc định: `0`).
- **Phản hồi thành công**: `200 OK` - Model: `FeasibilityEvaluationListVm`.
