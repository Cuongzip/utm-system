# 07. MODULE MISSIONS (Thực thể: `Mission`, `Waypoint`, `MissionExecution`)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Quản lý kế hoạch nhiệm vụ bay nghiệp vụ (Mission Intent), chuỗi tọa độ mốc 3D (Waypoints), hành động tại mốc (Actions/Payload drop), kiểm tra an toàn vùng trời (Airspace Safety Check), sao chép nhiệm vụ (Duplicate) và chuyển đổi nhiệm vụ sang chuyến bay thực tế (Mission Execution).

---

## 7.1 Cấu Trúc Bảng Dữ Liệu

### Bảng `mission`
> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `code` | `varchar(50)` | `string` | NOT NULL, **UNIQUE** (Auto-gen) | Mã định danh nhiệm vụ (`MSN-YYMMDD-XXXX`) |
| `name` | `varchar(255)` | `string` | NOT NULL | Tên nhiệm vụ |
| `description` | `text` | `string` | NULLABLE | Mô tả chi tiết mục tiêu nhiệm vụ |
| `payload_weight_kg` | `double precision` | `number` | NOT NULL, Default: `0.0` | Khối lượng hàng hóa dự kiến (kg) |
| `departure_hub_id` | `varchar(36)` | `string` | NOT NULL | Bãi đáp khởi hành |
| `arrival_hub_id` | `varchar(36)` | `string` | NOT NULL | Bãi đáp đích |
| `drone_id` | `varchar(36)` | `string` | NULLABLE | Drone được chỉ định mặc định (nếu có) |
| `pilot_id` | `varchar(100)` | `string` | NULLABLE | Phi công phụ trách (nếu có) |
| `schedule_type` | `varchar(50)` | `MissionScheduleType` | NOT NULL, Default: `'IMMEDIATE'` | Kiểu lập lịch bay (`immediate`, `scheduled`; DB UPPERCASE) |
| `scheduled_at` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm dự kiến thực hiện (phải ở tương lai nếu SCHEDULED) |
| `recurring_pattern` | `varchar(100)` | `string` | NULLABLE | Biểu thức lặp định kỳ (cron) |
| `dispatch_grace_minutes` | `integer` | `number` | NOT NULL, Default: `30` | Cửa sổ hết hạn điều phối tự động sau `scheduled_at` (phút) |
| `trigger_conditions` | `jsonb` | `Record<string, unknown>` | NULLABLE | Điều kiện kích hoạt tự động theo sự kiện |
| `required_capabilities` | `jsonb` | `string[]` | NULLABLE | Danh sách năng lực Drone bắt buộc (phục vụ chấm điểm `fleet`) |
| `feasibility_override` | `jsonb` | `Record<string, unknown>` | NULLABLE | Cấu hình ghi đè tham số thẩm định năng lượng |
| `template_id` | `varchar(36)` | `string` | NULLABLE | Khóa tham chiếu mẫu nhiệm vụ gốc (`mission_template.id`) |
| `template_version` | `integer` | `number` | NULLABLE | Phiên bản mẫu nhiệm vụ tại thời điểm khởi tạo |
| `estimated_distance` | `double precision` | `number` | NULLABLE | Tổng cự ly hành trình tính tự động theo Haversine (mét) |
| `estimated_duration` | `integer` | `number` | NULLABLE | Tổng thời gian bay ước tính (giây) |
| `status` | `varchar(50)` | `MissionStatus` | NOT NULL, Default: `'DRAFT'` | Trạng thái nhiệm vụ (DB UPPERCASE) |

---

### Bảng `waypoint`
> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `mission_id` | `varchar(36)` | `string` | **FK** -> `mission.id` (`ON DELETE CASCADE`), NOT NULL | Thuộc nhiệm vụ nào |
| `sequence` | `integer` | `number` | NOT NULL, **UNIQUE** với `mission_id` | Thứ tự điểm mốc trong hành trình (bắt đầu từ 1) |
| `name` | `varchar(100)` | `string` | NULLABLE | Tên gợi nhớ của mốc |
| `waypoint_type` | `varchar(20)` | `WaypointType` | NOT NULL, Default: `'COORDINATE'` | Phân loại nút: `coordinate` (tọa độ bay trên không) hoặc `hub` (nút Vertiport chia chặng `Flight`) |
| `latitude` | `double precision` | `number` | NOT NULL | Vĩ độ GPS (-90 đến 90; khóa cứng theo tọa độ Hub khi `waypoint_type = HUB`) |
| `longitude` | `double precision` | `number` | NOT NULL | Kinh độ GPS (-180 đến 180; khóa cứng theo tọa độ Hub khi `waypoint_type = HUB`) |
| `altitude` | `double precision` | `number` | NOT NULL | Cao độ bay **AGL** so với mặt đất/bệ đáp (mét: `> 0` với `COORDINATE`; `>= 0` và mặc định `0.0` mặt bệ đáp với `HUB`) |
| `speed_to_waypoint` | `double precision` | `number` | NULLABLE | Vận tốc mục tiêu bay tới mốc (m/s) |
| `heading_at_waypoint` | `double precision` | `number` | NULLABLE | Góc hướng mũi bay tại mốc (0–360 độ) |
| `turn_radius` | `double precision` | `number` | NULLABLE | Bán kính vòng rẽ fly-by (mét) |
| `hover_duration_sec` | `integer` | `number` | NOT NULL, Default: `0` | Thời gian bay treo tại mốc (giây) |
| `wait_for_confirmation` | `boolean` | `boolean` | NOT NULL, Default: `false` | Tự động gửi lệnh `HOVER` chờ người vận hành xác nhận khi chạm mốc |
| `actions` | `jsonb` | `Map<string, any>` | NULLABLE | Hành động tại mốc: `{ "type": "hover", "durationS": 10 }` |
| `conditions` | `jsonb` | `Map<string, any>` | NULLABLE | Điều kiện bay: `{ "maxSpeed": 15 }` |
| `hub_id` | `varchar(36)` | `string` | NULLABLE (NOT NULL nếu `HUB`) | Hub tham chiếu (trạm đầu `Departure`, trạm cuối `Arrival`, hoặc Hub dừng trung gian đang `active`) nếu `waypoint_type = HUB` |
| `stopover_type` | `varchar(30)` | `StopoverType` | NOT NULL, Default: `'NONE'` | Loại điểm dừng (`none` cho 2 đầu mút `Departure`/`Arrival` hoặc `COORDINATE`; `recharge`, `battery_swap`, `relay_handoff`, `payload_dropoff`, `payload_pickup` cho `HUB` trung gian chia chặng `Flight`) |
| `ground_time_minutes` | `integer` | `number` | NULLABLE | Thời gian dừng tại điểm trung gian (phút) |
| `payload_delta_kg` | `double precision` | `number` | NOT NULL, Default: `0.0` | Biến thiên khối lượng hàng hóa sau khi rời mốc (kg) |

---

### Bảng `mission_execution`
> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `mission_id` | `varchar(36)` | `string` | **FK** -> `mission.id` (`ON DELETE CASCADE`), NOT NULL | Thuộc nhiệm vụ nào |
| `current_waypoint_index` | `integer` | `number` | NOT NULL, Default: 0 | Chỉ số waypoint gần nhất drone đã đi qua |
| `completed_waypoints` | `integer` | `number` | NOT NULL, Default: 0 | Tổng số waypoint đã hoàn tất trong lượt thực thi |
| `waypoint_logs` | `jsonb` | `Array<Record<string, unknown>>` | NOT NULL, Default: `'[]'` | Nhật ký thời gian thực các lần chạm waypoint (`flightId`, `legIndex`, `waypointIndex`, `reachedAt`, `waitForConfirmation`) |
| `started_at` | `timestamptz` | `string (ISO 8601)` | NOT NULL | Thời điểm bắt đầu thực thi |
| `completed_at` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm kết thúc thực thi |
| `status` | `varchar(50)` | `ExecutionStatus` | NOT NULL, Default: `'IN_PROGRESS'` | Trạng thái thực thi |
| `version` | `bigint` | — | NOT NULL, Default: `0` | Optimistic Locking (`@Version`) |

---

### Bảng `mission_execution_leg`
> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity`. Lưu từng chặng bay liên kết với `flight` service khi nhiệm vụ chạy đa chặng.

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `execution_id` | `varchar(36)` | `string` | **FK** -> `mission_execution.id` (`ON DELETE CASCADE`), NOT NULL | Thuộc lần thực thi nào |
| `leg_index` | `integer` | `number` | NOT NULL, **UNIQUE** với `execution_id` | Thứ tự chặng bay (bắt đầu từ 1) |
| `flight_id` | `varchar(36)` | `string` | NULLABLE, **UNIQUE** | Chuyến bay tương ứng ở `flight` service |
| `drone_id` | `varchar(36)` | `string` | NULLABLE | Drone được giao thực hiện chặng |
| `departure_hub_id` | `varchar(36)` | `string` | NOT NULL | Trạm cất cánh của chặng |
| `arrival_hub_id` | `varchar(36)` | `string` | NOT NULL | Trạm hạ cánh của chặng |
| `stopover_type` | `varchar(30)` | `StopoverType` | NOT NULL, Default: `'NONE'` | Hành động dừng tại trạm cuối chặng |
| `ground_time_minutes` | `integer` | `number` | NOT NULL, Default: `0` | Thời gian chờ/sạc mặt đất (phút) |
| `estimated_energy_wh` | `double precision` | `number` | NOT NULL, Default: `0.0` | Năng lượng ước tính cho chặng (Wh) |
| `status` | `varchar(50)` | `LegStatus` | NOT NULL, Default: `'PLANNED'` | Trạng thái chặng (`planned`, `in_flight`, `completed`, `aborted`, `failed`) |

---

## 7.2 Các Enum Định Nghĩa

```typescript
export type MissionScheduleType = "IMMEDIATE" | "SCHEDULED";

export type MissionStatus =
  | "DRAFT"        // Đang soạn thảo lộ trình & mốc
  | "SCHEDULED"    // Đã lên lịch, sẵn sàng thực thi
  | "EXECUTING"    // Đang trong tiến trình thực thi bay
  | "PAUSED"       // Đang tạm hoãn thực thi
  | "COMPLETED"    // Hoàn thành nhiệm vụ
  | "ABORTED"      // Bị hủy giữa chừng trong lúc bay
  | "FAILED";      // Thất bại

export type ExecutionStatus =
  | "IN_PROGRESS"  // Đang bay thực hiện nhiệm vụ
  | "PAUSED"       // Tạm dừng
  | "COMPLETED"    // Đã hoàn tất toàn bộ waypoints
  | "ABORTED"      // Hủy ngang
  | "FAILED";      // Thất bại
```

---

## 7.3 Mối Quan Hệ Liên Kết (Relationships)

- **`Hub` (N - 1)**: Bãi đi (`departure_hub_id`) và bãi đến (`arrival_hub_id`) được xác thực qua `HubClientService`.
- **`Waypoint` (1 - N)**: Một nhiệm vụ chứa danh sách các điểm mốc tọa độ (`mission.id <- waypoint.mission_id`). Xóa mission sẽ xóa toàn bộ waypoints (Cascade / Orphan removal).
- **`MissionExecution` (1 - N)**: Một nhiệm vụ có thể có nhiều lần chạy thực thi (`mission.id <- mission_execution.mission_id`).
- **`Flight` (1 - 1 qua API Client)**: Khi thực thi nhiệm vụ, gọi `FlightClientService` để tạo bản ghi Chuyến bay (`Flight`) với danh sách waypoints và cao độ hành trình (`cruisingAltitude`).

---

## 7.4 Chi Tiết Từng Endpoint

### 7.4.1 Nhóm Quản Lý Kế Hoạch Nhiệm Vụ (Mission Intent)

#### `POST /api/v1/missions`
Soạn thảo kế hoạch nhiệm vụ mới ở trạng thái `DRAFT`. Waypoint được thêm tuần tự sau thông qua nhóm API Waypoints.

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Input (Request Body)** - Model: `MissionPostVm`:
  ```json
  {
    "code": "MSN-261107-A4B2",
    "name": "Nhiệm vụ giao hàng chặng Hub 1 - Hub 2",
    "description": "Vận chuyển túi máu đông lạnh từ Hub D1 sang Bệnh viện",
    "departureHubId": "550e8400-e29b-41d4-a716-446655440000",
    "arrivalHubId": "660e8400-e29b-41d4-a716-446655440001",
    "scheduleType": "IMMEDIATE",
    "scheduledAt": null
  }
  ```
- **Logic xử lý cốt lõi**:
  1. **Mission Code Generation & Unique Check**:
     - Nếu `code` bỏ trống hoặc null: Tự động sinh mã duy nhất theo rule `MISSION_CODE` (`MSN-YYMMDD-XXXX`, ví dụ `MSN-261107-4K8P`).
     - Nếu người dùng nhập tay: Chuẩn hóa trim/uppercase và kiểm tra trùng lặp trong DB. Nếu đã tồn tại $\rightarrow$ `409 Conflict` (`MISSION_CODE_ALREADY_EXISTED`).
  2. Kiểm tra tồn tại `departureHubId` và `arrivalHubId` qua `HubClientService`. Nếu không tồn tại $\rightarrow$ `404 Not Found` (`DEPARTURE_HUB_NOT_FOUND` / `ARRIVAL_HUB_NOT_FOUND`).
  3. Nếu `scheduleType == SCHEDULED`, yêu cầu `scheduledAt` không được null và phải ở thời điểm tương lai $\rightarrow$ nếu không $\rightarrow$ `400 Bad Request` (`SCHEDULED_TIME_MUST_BE_FUTURE`).
  4. Khởi tạo `status = DRAFT`. Lưu DB và làm giàu thông tin bãi đáp từ Hub Service.
- **Phản hồi thành công**: `201 Created` - Model: `MissionVm`.

---

#### `GET /api/v1/missions`
Lấy danh sách nhiệm vụ bay có phân trang và bộ lọc.

- **Chỉ định role**: Authenticated
- **Input (Query Params)**:
  - `status`: Lọc theo trạng thái nhiệm vụ (`draft`, `scheduled`, `executing`, `paused`, `completed`, `aborted`, `failed`).
  - `departureHubId`: UUID bãi cất cánh.
  - `arrivalHubId`: UUID bãi hạ cánh.
  - `scheduleType`: Kiểu lập lịch (`immediate`, `scheduled`).
  - `page`: Chỉ số trang (zero-based, mặc định `0`).
  - `size`: Số bản ghi mỗi trang (mặc định `20`).
- **Phản hồi thành công**: `200 OK` - Model: `MissionListVm`.

---

#### `GET /api/v1/missions/{id}`
Lấy chi tiết nhiệm vụ bay kèm danh sách toàn bộ Waypoints và khoảng cách dự tính theo công thức Haversine.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `MissionVm` (kèm danh sách waypoints đã sắp thứ tự sequence asc, thông tin chi tiết bãi đi/đến, khoảng cách `estimatedDistanceMeters`).
- **Phản hồi lỗi**: `404 Not Found` (`MISSION_NOT_FOUND`).

---

#### `PUT /api/v1/missions/{id}`
Cập nhật nội dung kế hoạch nhiệm vụ khi còn ở trạng thái `DRAFT`.

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Ràng buộc nghiệp vụ**:
  - Không cho phép cập nhật khi nhiệm vụ đang chạy `EXECUTING` $\rightarrow$ `400 Bad Request` (`CANNOT_EDIT_EXECUTING_MISSION`).
  - Nhiệm vụ phải ở trạng thái `DRAFT` $\rightarrow$ nếu ở trạng thái khác $\rightarrow$ `400 Bad Request` (`MISSION_NOT_IN_DRAFT_STATUS`).
  - Kiểm tra tồn tại của Hub mới nếu có thay đổi departure/arrival hub.
  - Nếu chuyển sang hoặc cập nhật `SCHEDULED`, `scheduledAt` phải ở tương lai.
- **Phản hồi thành công**: `200 OK` - Model: `MissionVm`.

---

#### `DELETE /api/v1/missions/{id}`
Xóa hoàn toàn nhiệm vụ và cascade xóa toàn bộ waypoints liên quan.

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Ràng buộc nghiệp vụ**:
  - Không cho phép xóa nhiệm vụ đang thực thi `EXECUTING` hoặc đang tạm dừng `PAUSED` $\rightarrow$ `400 Bad Request` (`CANNOT_DELETE_ACTIVE_MISSION`).
  - Không tìm thấy nhiệm vụ $\rightarrow$ `404 Not Found` (`MISSION_NOT_FOUND`).
- **Phản hồi thành công**: `200 OK` - `{ "message": "Mission deleted successfully" }`.

---

#### `POST /api/v1/missions/{id}/schedule`
Chuyển nhiệm vụ từ `DRAFT` sang `SCHEDULED` để hệ thống tự động thực thi tại `scheduledAt`.

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Ràng buộc nghiệp vụ**: Nhiệm vụ ở trạng thái `DRAFT`, có `scheduledAt` ở tương lai và tối thiểu 2 waypoints.
- **Phản hồi thành công**: `200 OK` - Model: `MissionVm`.

---

#### `POST /api/v1/missions/{id}/unschedule`
Chuyển nhiệm vụ đang ở trạng thái `SCHEDULED` quay lại `DRAFT` để chỉnh sửa.

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Phản hồi thành công**: `200 OK` - Model: `MissionVm`.

---

#### `POST /api/v1/missions/{id}/duplicate`
Sao chép nhân bản một nhiệm vụ cùng toàn bộ danh sách waypoints thành một nhiệm vụ mới ở trạng thái `DRAFT`.

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Logic xử lý cốt lõi**:
  1. Tìm nhiệm vụ gốc cùng danh sách waypoints.
  2. Nhân bản entity, đổi tên thành `"{tên gốc} (Bản sao)"`, đặt lại `scheduleType = IMMEDIATE`, `status = DRAFT`.
  3. Nhân bản toàn bộ danh sách waypoints (sao chép actions và conditions sang map mới) và liên kết vào nhiệm vụ bản sao.
  4. Lưu DB nguyên khối và trả về chi tiết nhiệm vụ mới.
- **Phản hồi thành công**: `201 Created` - Model: `MissionVm`.
- **Phản hồi lỗi**: `404 Not Found` (`MISSION_NOT_FOUND`).

---

### 7.4.2 Nhóm Quản Lý Điểm Mốc Lộ Trình (Waypoints)

#### `POST /api/v1/missions/{missionId}/waypoints`
Thêm một điểm mốc 3D mới vào cuối lộ trình của nhiệm vụ (tự động tính `sequence = maxSequence + 1`).

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Ràng buộc nghiệp vụ**:
  - Nhiệm vụ phải ở trạng thái `DRAFT` $\rightarrow$ `400 Bad Request` (`MISSION_NOT_IN_DRAFT_STATUS`).
  - Tự động gọi `AirspaceClientService.checkPointSafety` để kiểm tra cảnh báo an toàn vùng trời (gần khu vực cấm bay/hạn chế). Nếu có cảnh báo, lưu kèm vào `warning` của viewmodel phản hồi.
- **Input (Request Body)** - Model: `WaypointPostVm`:
  ```json
  {
    "name": "Điểm rẽ tránh tòa nhà Landmark",
    "latitude": 10.7769,
    "longitude": 106.7009,
    "altitude": 50.0,
    "actions": { "type": "hover", "durationS": 10 },
    "conditions": { "maxSpeed": 15 }
  }
  ```
- **Phản hồi thành công**: `201 Created` - Model: `WaypointVm`.

---

#### `GET /api/v1/missions/{missionId}/waypoints`
Lấy danh sách toàn bộ waypoints của nhiệm vụ theo thứ tự `sequence ASC`.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - `List<WaypointVm>`.
- **Phản hồi lỗi**: `404 Not Found` (`MISSION_NOT_FOUND`).

---

#### `PUT /api/v1/missions/{missionId}/waypoints/{waypointId}`
Cập nhật thông số tọa độ, độ cao, hành động của một điểm mốc.

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Ràng buộc nghiệp vụ**:
  - Nhiệm vụ phải ở trạng thái `DRAFT` $\rightarrow$ `400 Bad Request` (`MISSION_NOT_IN_DRAFT_STATUS`).
  - Kiểm tra lại an toàn vùng trời qua `AirspaceClientService` và cập nhật trường `warning`.
- **Input (Request Body)** - Model: `WaypointPutVm`:
  ```json
  {
    "name": "Điểm rẽ cập nhật",
    "latitude": 10.7780,
    "longitude": 106.7020,
    "altitude": 60.0,
    "actions": { "type": "hover", "durationS": 15 },
    "conditions": { "maxSpeed": 20 }
  }
  ```
- **Phản hồi thành công**: `200 OK` - Model: `WaypointVm`.
- **Phản hồi lỗi**: `404 Not Found` (`MISSION_NOT_FOUND` hoặc `WAYPOINT_NOT_FOUND`).

---

#### `DELETE /api/v1/missions/{missionId}/waypoints/{waypointId}`
Xóa điểm mốc và tự động đánh lại số thứ tự (`sequence`) cho các điểm mốc còn lại bắt đầu từ 1.

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Ràng buộc nghiệp vụ**: Nhiệm vụ phải ở trạng thái `DRAFT`.
- **Phản hồi thành công**: `200 OK` - `{ "message": "Waypoint removed and sequence re-indexed" }`.
- **Phản hồi lỗi**: `404 Not Found` (`WAYPOINT_NOT_FOUND`).

---

#### `POST /api/v1/missions/{missionId}/waypoints/reorder`
Đánh lại thứ tự toàn bộ waypoints trong nhiệm vụ theo danh sách chỉ định trong một transaction nguyên khối.

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Ràng buộc nghiệp vụ**:
  - Nhiệm vụ phải ở trạng thái `DRAFT`.
  - Số lượng phần tử trong mảng `order` phải khớp đúng tổng số waypoint hiện có của nhiệm vụ.
  - Tất cả `waypointId` phải thuộc về nhiệm vụ.
  - Các giá trị `sequence` mới không được trùng lặp.
  - Nếu vi phạm bất kỳ điều kiện nào $\rightarrow$ `400 Bad Request` (`WAYPOINT_REORDER_INVALID`).
- **Input (Request Body)** - Model: `WaypointReorderVm`:
  ```json
  {
    "order": [
      { "waypointId": "550e8400-e29b-41d4-a716-446655440001", "sequence": 1 },
      { "waypointId": "550e8400-e29b-41d4-a716-446655440000", "sequence": 2 }
    ]
  }
  ```
- **Phản hồi thành công**: `200 OK` - Danh sách `List<WaypointVm>` sau khi đã sắp xếp lại.

---

#### `POST /api/v1/missions/{missionId}/waypoints/auto-plan-hubs`
Tự động phân tích ngân sách năng lượng (kèm dự trữ an toàn 20%) dọc toàn bộ lộ trình của nhiệm vụ lớn và chèn các `Waypoint` loại `HUB` (`waypointType = "hub"`, `altitude = 0.0` AGL) theo 2 cơ chế thống nhất (`MissionRouteSplitter`):
1. **Dijkstra Multi-Hub Bridging**: Tự động bắc cầu qua chuỗi `1..K` trạm Hub đang `active` đối với các đoạn bay vượt tầm pin đơn.
2. **Survey / Patrol Return-to-Nearest-Hub Split**: Cộng dồn năng lượng qua chuỗi điểm `COORDINATE`; ngay khi bước tiếp theo vượt ngưỡng an toàn để quay về Hub, tự động chèn điểm hạ cánh `HUB` gần nhất (`RECHARGE` / `BATTERY_SWAP` / `RELAY_HANDOFF`) để đóng `Flight m` và mở `Flight m+1` bay tiếp từ Hub đó tới `WP[i+1]`.

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Input (Request Body)** - Model: `AutoPlanHubsRequestVm` *(tùy chọn)*:
  ```json
  {
    "droneId": "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "preferredStopoverType": "recharge",
    "persist": true
  }
  ```
- **Phản hồi thành công**: `200 OK` - Model: `AutoPlanHubsResultVm` (bao gồm số Hub đã chèn, số chặng `Flight` sinh ra, danh sách `WaypointVm` kèm thông tin `hub` và danh sách giải trình `notes`).
- **Phản hồi lỗi**: `400 Bad Request` (`MISSION_NOT_IN_DRAFT_STATUS`, `MISSION_WAYPOINTS_LESS_THAN_TWO`, `MISSION_SEGMENT_EXCEEDS_HUB_NETWORK_RANGE`), `404 Not Found`.

---

### 7.4.3 Nhóm Thực Thi Nhiệm Vụ (Mission Execution)

#### `POST /api/v1/missions/{missionId}/execute`
Chuyển đổi nhiệm vụ sang chuyến bay thực tế, khởi tạo bản ghi thực thi và sinh chuyến bay qua Flight Service.

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Input (Request Body)** - Model: `MissionExecutePostVm`:
  ```json
  {
    "droneId": "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "pilotId": "PILOT-VN-007"
  }
  ```
- **Logic xử lý cốt lõi**:
  1. Kiểm tra trạng thái nhiệm vụ: Phải ở `DRAFT` hoặc `SCHEDULED`. Nếu đang `EXECUTING` hoặc trạng thái khác $\rightarrow$ `400 Bad Request` (`CANNOT_EDIT_EXECUTING_MISSION`).
  2. Kiểm tra số lượng waypoint: Phải có tối thiểu 2 điểm mốc $\rightarrow$ nếu ít hơn $\rightarrow$ `400 Bad Request` (`MISSION_WAYPOINTS_LESS_THAN_TWO`).
  3. Kiểm tra Drone qua `DroneClientService`: Drone phải ở trạng thái `'available'` hoặc `'idle'` $\rightarrow$ nếu không $\rightarrow$ `400 Bad Request` (`DRONE_NOT_AVAILABLE`).
  4. Tạo bản ghi `MissionExecution` (`status = IN_PROGRESS`, `currentWaypointIndex = 0`, `completedWaypoints = 0`).
  5. Gọi `FlightClientService.createFlight` với tuyến đường bay sinh từ chuỗi Waypoints, độ cao bay hành trình cao nhất trong danh sách mốc, mã chuyến bay `FL-{timestamp}`.
  6. Đổi trạng thái nhiệm vụ thành `MissionStatus.EXECUTING`.
- **Phản hồi thành công**: `201 Created` - Model: `MissionExecutionResultVm`:
  ```json
  {
    "execution": {
      "id": "e1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "missionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "currentWaypointIndex": 0,
      "totalWaypoints": 3,
      "completedWaypoints": 0,
      "startedAt": "2026-10-15T09:00:00Z",
      "completedAt": null,
      "status": "in_progress"
    },
    "flight": {
      "flightNumber": "FL-1729000000000",
      "droneId": "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "pilotId": "PILOT-VN-007",
      "status": "planned"
    }
  }
  ```
- **Phản hồi lỗi**: `400 Bad Request`, `404 Not Found`.

---

#### `GET /api/v1/missions/{missionId}/executions`
Lấy danh sách toàn bộ các lượt chạy thực thi của nhiệm vụ, sắp xếp theo thời gian bắt đầu giảm dần (`startedAt DESC`).

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - `List<MissionExecutionVm>`.

---

#### `GET /api/v1/executions/{id}`
Lấy chi tiết tiến trình thực thi của một lượt chạy cụ thể theo ID (bao gồm Multi-Leg Execution Saga: `POST /api/v1/missions/{id}/execution-plan`, `/api/v1/executions/{id}/pause|resume|abort`).

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `MissionExecutionVm`.
- **Phản hồi lỗi**: `404 Not Found` (`MISSION_EXECUTION_NOT_FOUND`).

---

### 7.4.4 Nhóm Thư Viện Mẫu Nhiệm Vụ Có Phiên Bản (`MissionTemplate` — `/api/v1/templates`)
Bảng `mission_template` *(kế thừa `AbstractAuditEntity`)* lưu trữ các mẫu lộ trình chuẩn hóa có quản lý phiên bản bất biến (`code`, `version`, `is_latest`, `previous_version_id`, `category`, `tags`, `variables`, `blueprint`, `is_published`, `usage_count`):
- **`GET /api/v1/templates`** & **`GET /api/v1/templates/{id}`** *(Authenticated)*: Tìm kiếm mẫu nhiệm vụ (`?category=medical&published=true&latestOnly=true&search=...`) và xem chi tiết blueprint.
- **`GET /api/v1/templates/{id}/versions`** *(Authenticated)*: Truy xuất chuỗi lịch sử các phiên bản của cùng mã mẫu `code`.
- **`POST /api/v1/templates`** *(`admin, hub_operator, pilot`)*: Tạo mẫu nhiệm vụ mới ở phiên bản `v1`.
- **`PUT /api/v1/templates/{id}`** *(`admin, hub_operator, pilot`)*: Tạo phiên bản mới bất biến (`version + 1`, đánh dấu bản cũ `is_latest = false` và nối `previous_version_id`).
- **`POST /api/v1/templates/{id}/publish`** & **`POST /api/v1/templates/{id}/unpublish`** *(`admin, hub_operator`)*: Xuất bản hoặc gỡ xuất bản mẫu nhiệm vụ.
- **`POST /api/v1/templates/{id}/clone`** *(`admin, hub_operator, pilot`)*: Nhân bản thành mẫu độc lập mới.
- **`POST /api/v1/templates/{id}/instantiate`** *(`admin, hub_operator, pilot`)*: Nội suy biến động `{{variable}}` trong `blueprint`, tự động khởi tạo `Mission` (`DRAFT`) kèm danh sách `Waypoint`, tính `estimatedDistance`/`estimatedDuration` và tăng `usageCount`.
- **`DELETE /api/v1/templates/{id}`** *(`admin, hub_operator`)*: Xóa phiên bản mẫu nhiệm vụ.
