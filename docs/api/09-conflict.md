# 09. MODULE CONFLICTS (Thực thể: `Conflict`, `ConflictSnapshot`)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Phát hiện, cảnh báo thời gian thực và tự động tính toán phương án giải tỏa xung đột va chạm không gian 4D (Spatial-Temporal Deconfliction) giữa các drone hoặc giữa drone với không phận cấm.

---

## 9.1 Cấu Trúc Bảng Dữ Liệu

### Bảng `conflict`
> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `varchar(36)` | `string` | **PK**, NOT NULL | UUID định danh bản ghi xung đột |
| `conflict_type` | `varchar(50)` | `ConflictType` | NOT NULL, Default: `'separation_minimum'` | Phân loại xung đột không gian |
| `severity` | `varchar(20)` | `ConflictSeverity` | NOT NULL, Default: `'MEDIUM'` | Mức độ nghiêm trọng của nguy cơ va chạm |
| `status` | `varchar(50)` | `ConflictStatus` | NOT NULL, Default: `'detected'` | Trạng thái vòng đời xử lý xung đột |
| `primary_flight_id` | `varchar(36)` | `string` | **FK** -> `flight.id`, NOT NULL | Chuyến bay thứ nhất (Chủ thể) |
| `secondary_flight_id` | `varchar(36)` | `string` | **FK** -> `flight.id`, NULLABLE | Chuyến bay thứ hai (đối tượng có nguy cơ va chạm) |
| `hub_id` | `varchar(36)` | `string` | NULLABLE | Trạm trung chuyển (Hub) liên quan gần nhất |
| `detected_at` | `timestamptz` | `string (ISO 8601)` | NOT NULL | Thời điểm phát hiện xung đột |
| `detection_method` | `varchar(50)` | `string` | NULLABLE | Cơ chế phát hiện (`automated_telemetry`, `airspace_geofence_check`, `automated_conformance`) |
| `location_lat` | `double precision` | `number` | NULLABLE | Vĩ độ tâm xung đột |
| `location_lon` | `double precision` | `number` | NULLABLE | Kinh độ tâm xung đột |
| `altitude` | `double precision` | `number` | NULLABLE | Cao độ trung bình tại điểm xung đột (mét) |
| `separation_distance` | `double precision` | `number` | NULLABLE | Khoảng cách ngang tức thời giữa 2 drone (mét) |
| `min_separation_distance` | `double precision` | `number` | NULLABLE | Khoảng cách ngang tối thiểu ghi nhận được (mét) |
| `vertical_separation` | `double precision` | `number` | NULLABLE | Khoảng cách đứng (cao độ) giữa 2 drone (mét) |
| `max_severity` | `varchar(20)` | `ConflictSeverity` | NULLABLE | Mức độ nghiêm trọng cao nhất từng đạt tới |
| `time_to_conflict_sec` | `integer` | `number` | NULLABLE | Thời gian ước tính tới điểm tiếp cận gần nhất (TCPA, giây) |
| `description` | `text` | `string` | NULLABLE | Mô tả chi tiết nguyên nhân vi phạm/xung đột |
| `resolution_strategy` | `varchar(50)` | `ResolutionStrategy` | NULLABLE | Chiến lược giải tỏa xung đột được chọn |
| `resolution_actions` | `text` | `Record<string, unknown>` | NULLABLE | Chỉ thị điều hành JSON chi tiết (đổi độ cao, tốc độ, đổi hướng) |
| `resolved_at` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm giải quyết xong |
| `resolved_by` | `varchar(100)` | `string` | NULLABLE | Người xử lý hoặc hệ thống AI tự động giải quyết |

---

### Bảng `conflict_snapshot` (Hộp đen chụp ảnh xung đột)
> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`). Lưu lại vết khoảng cách va chạm và tọa độ 2 drone qua từng chu kỳ phục vụ mô phỏng 3D và điều tra an toàn.

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `varchar(36)` | `string` | **PK**, NOT NULL | UUID định danh bản ghi snapshot |
| `conflict_id` | `varchar(36)` | `string` | **FK** -> `conflict.id`, NOT NULL | Mã liên kết xung đột cha |
| `recorded_at` | `timestamptz` | `string (ISO 8601)` | NOT NULL | Thời điểm chụp dữ liệu snapshot |
| `primary_lat` | `double precision` | `number` | NULLABLE | Vĩ độ tức thời máy bay chính |
| `primary_lon` | `double precision` | `number` | NULLABLE | Kinh độ tức thời máy bay chính |
| `primary_alt` | `double precision` | `number` | NULLABLE | Cao độ tức thời máy bay chính (mét) |
| `secondary_lat` | `double precision` | `number` | NULLABLE | Vĩ độ tức thời máy bay phụ |
| `secondary_lon` | `double precision` | `number` | NULLABLE | Kinh độ tức thời máy bay phụ |
| `secondary_alt` | `double precision` | `number` | NULLABLE | Cao độ tức thời máy bay phụ (mét) |
| `separation_distance` | `double precision` | `number` | NULLABLE | Khoảng cách ngang tức thời (mét) |
| `vertical_separation` | `double precision` | `number` | NULLABLE | Khoảng cách đứng tức thời (mét) |
| `time_to_conflict_sec` | `integer` | `number` | NULLABLE | Thời gian ước tính tới va chạm tại snapshot (giây) |
| `severity` | `varchar(20)` | `ConflictSeverity` | NULLABLE | Mức độ nghiêm trọng tại thời điểm snapshot |

---

## 9.2 Các Enum Định Nghĩa

```typescript
export type ConflictType =
  | "loss_of_separation"   // Mất khoảng cách an toàn tối thiểu giữa 2 máy bay
  | "geofence_violation"   // Vi phạm hàng rào địa lý hành lang bay
  | "airspace_breach"      // Xâm phạm không phận cấm / hạn chế
  | "terrain_proximity"    // Nguy cơ va chạm địa hình bề mặt
  | "separation_minimum"   // Cận kề ngưỡng phân cách tối thiểu
  | "head_on"              // Hai máy bay bay đối đầu trực diện
  | "convergence";         // Hai quỹ đạo giao cắt đồng quy

export type ConflictSeverity =
  | "emergency"            // Cực kỳ khẩn cấp, nguy cơ va chạm tức thì
  | "critical"             // Nguy hiểm cấp bách
  | "high"                 // Mức độ cao
  | "warning"              // Cảnh báo sớm
  | "medium"               // Trung bình
  | "low";                 // Thấp

export type ConflictStatus =
  | "detected"             // Mới phát hiện tự động
  | "notified"             // Đã gửi thông báo cảnh báo tới các bên
  | "acknowledged"         // ATC hoặc điều hành viên đã tiếp nhận
  | "resolving"            // Đang trong tiến trình thực thi tránh va chạm
  | "resolved"             // Đã giải tỏa xung đột an toàn
  | "dismissed";           // Bỏ qua hoặc báo động giả

export type ResolutionStrategy =
  | "hover"                // Treo tại chỗ chờ máy bay kia vượt qua
  | "reroute"              // Đổi hướng bay lệch góc an toàn
  | "divert_altitude"      // Chuyển hướng kết hợp đổi độ cao
  | "return_to_base"       // Quay đầu về căn cứ / hub xuất phát
  | "speed_adjustment"     // Điều chỉnh giảm tốc để nhường quyền ưu tiên
  | "altitude_change"      // Nâng hoặc hạ trần bay
  | "hold"                 // Chờ trong khu vực bay chờ
  | "auto_cleared";        // Hệ thống tự động giải tỏa khi tách xa an toàn
```

---

## 9.3 Mối Quan Hệ Liên Kết (Relationships)

- **`Flight` (N - 1)**: Liên kết với chuyến bay chủ thể `conflict.primary_flight_id -> flight.id` và chuyến bay thứ hai `conflict.secondary_flight_id -> flight.id`.
- **`ConflictSnapshot` (1 - N)**: Một bản ghi xung đột ghi nhận nhiều snapshot tọa độ theo thời gian (`conflict_snapshot.conflict_id -> conflict.id`).
- **`Alert`**: Khi phát hiện xung đột mới mức `HIGH`/`CRITICAL` hoặc xâm phạm không phận cấm (`AIRSPACE_BREACH`), hệ thống tự động kích hoạt cảnh báo tới `alert` service.

---

## 9.4 Chi Tiết Từng Endpoint

### 9.4.1 `GET /api/v1/conflicts`
Lấy danh sách các xung đột không gian có bộ lọc và sắp xếp theo thời gian phát hiện mới nhất.

- **Chỉ định role**: `admin, atc, hub_operator, pilot`
- **Input (Query Params)**:
  - `status` (`string`, tùy chọn): Lọc theo trạng thái (`detected`, `notified`, `acknowledged`, `resolving`, `resolved`, `dismissed`)
  - `severity` (`string`, tùy chọn): Lọc theo mức độ (`emergency`, `critical`, `high`, `warning`, `medium`, `low`)
  - `flightId` (`string`, tùy chọn): Lọc theo chuyến bay chính hoặc phụ
- **Phản hồi thành công**: `200 OK` - Danh sách `List<ConflictVm>`.

---

### 9.4.2 `GET /api/v1/conflicts/active`
Lấy danh sách các xung đột đang hoạt động (`detected`, `notified`, `acknowledged`, `resolving`), ưu tiên theo thứ tự độ nghiêm trọng từ cao xuống thấp (`EMERGENCY` -> `CRITICAL` -> `HIGH` -> `WARNING` -> `MEDIUM` -> `LOW`).

- **Chỉ định role**: `admin, atc, hub_operator, pilot`
- **Phản hồi thành công**: `200 OK` - Danh sách `List<ConflictVm>`.

---

### 9.4.3 `GET /api/v1/conflicts/{id}`
Lấy chi tiết tính toán hình học 4D, khoảng cách phân cách và phương án giải tỏa xung đột.

- **Chỉ định role**: `admin, atc, hub_operator, pilot`
- **Phản hồi thành công**: `200 OK` - Model: `ConflictVm`.
- **Lỗi thường gặp**: `404 Not Found` nếu không tìm thấy conflict ID.

---

### 9.4.4 `POST /api/v1/conflicts`
Ghi nhận hoặc cập nhật xung đột không gian (thường được gọi bởi `flight` service khi vi phạm 4D corridor hoặc telemetry engine).

- **Chỉ định role**: `admin, atc, hub_operator, pilot`
- **Input (Request Body)**: `ConflictPostVm`
  ```json
  {
    "primaryFlightId": "550e8400-e29b-41d4-a716-446655440001",
    "secondaryFlightId": "550e8400-e29b-41d4-a716-446655440002",
    "conflictType": "loss_of_separation",
    "severity": "critical",
    "hubId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "locationLat": 10.7780,
    "locationLon": 106.7020,
    "altitude": 85.2,
    "separationDistance": 25.4,
    "verticalSeparation": 12.0,
    "timeToConflictSec": 35,
    "description": "Loss of separation: distance 25.4m below 150m threshold"
  }
  ```
- **Logic xử lý cốt lõi**:
  1. Kiểm tra xem chuyến bay chính đã có xung đột nào đang ở trạng thái active cùng loại (`conflictType`) hay chưa.
  2. Nếu đã tồn tại: Cập nhật vị trí, khoảng cách phân cách mới nhất và lưu DB.
  3. Nếu chưa tồn tại: Tạo mới bản ghi xung đột với trạng thái mặc định `DETECTED`, `detectedAt = now()`.
- **Phản hồi thành công**: `201 Created` - Model: `ConflictVm`.

---

### 9.4.5 `POST /api/v1/conflicts/{id}/acknowledge`
ATC hoặc điều hành viên tiếp nhận xử lý xung đột.

- **Chỉ định role**: `atc, admin, hub_operator`
- **Logic xử lý cốt lõi**:
  1. Nếu trạng thái đang là `DETECTED` hoặc `NOTIFIED` $\rightarrow$ Chuyển thành `ACKNOWLEDGED`.
  2. Lưu bản ghi và trả về dữ liệu mới nhất.
- **Phản hồi thành công**: `200 OK` - Model: `ConflictVm`.

---

### 9.4.6 `POST /api/v1/conflicts/{id}/resolve`
Áp dụng phương án giải tỏa xung đột và đánh dấu trạng thái `RESOLVED`.

- **Chỉ định role**: `admin, atc, hub_operator`
- **Input (Request Body)**: `ConflictResolvePostVm`
  ```json
  {
    "strategy": "altitude_change",
    "actions": {
      "targetAltitudeM": 120.0,
      "command": "CLIMB",
      "notes": "ATC command: Flight 1 climb to 120m to clear Flight 2 crossing at 90m"
    }
  }
  ```
- **Logic xử lý cốt lõi**:
  1. Cập nhật `status = 'RESOLVED'`.
  2. Lưu `resolutionStrategy = resolveVm.strategy()`.
  3. Tuần tự hóa `actions` thành chuỗi JSON lưu vào `resolution_actions`.
  4. Đánh dấu `resolvedAt = now()` và `resolvedBy = current_user`.
- **Phản hồi thành công**: `200 OK` - Model: `ConflictVm`.

---

### 9.4.7 `POST /api/v1/conflicts/evaluate`
Kích hoạt chu kỳ quét phát hiện xung đột không gian tức thời trên toàn bộ các chuyến bay đang hoạt động (`ACTIVE`).

- **Chỉ định role**: `admin, atc, hub_operator`
- **Logic xử lý cốt lõi**:
  1. Truy vấn danh sách chuyến bay đang bay (`FlightBriefVm`) từ `flight` service.
  2. Lấy telemetry mới nhất (`TelemetryBriefVm`) từ `telemetry` service.
  3. Kiểm tra xâm phạm không phận cấm qua `airspace` service (`POST /api/v1/airspace/check`).
  4. Phân tích ma trận cặp chuyến bay: tính khoảng cách Haversine ngang, độ lệch đứng và thời gian tới va chạm (`TCPA`).
  5. Nếu mất phân cách: Tự động tạo bản ghi `Conflict`, chụp `ConflictSnapshot`, và phát cảnh báo sang `alert` service nếu mức `HIGH`/`CRITICAL`.
  6. Nếu cặp xung đột đã tách xa vượt ngưỡng an toàn: Tự động chuyển `status = 'RESOLVED'` với chiến lược `AUTO_CLEARED`.
- **Phản hồi thành công**: `200 OK` - Model: `ConflictScanResultVm` (thống kê số chuyến bay, số cặp kiểm tra, số xung đột phát hiện mới, cập nhật, tự động giải quyết).

---

### 9.4.8 `GET /api/v1/conflicts/{conflictId}/snapshots`
Truy vấn toàn bộ các ảnh chụp vết không gian (snapshots) ghi nhận trong suốt vòng đời xung đột phục vụ vẽ biểu đồ và playback 3D.

- **Chỉ định role**: `admin, atc, hub_operator, pilot`
- **Phản hồi thành công**: `200 OK` - Danh sách `List<ConflictSnapshotVm>`.
- **Lỗi thường gặp**: `404 Not Found` nếu conflict ID không tồn tại.
