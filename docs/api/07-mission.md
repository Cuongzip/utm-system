# 07. MODULE MISSIONS (Thực thể: `Mission`, `Waypoint`, `MissionExecution`)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Quản lý kế hoạch nhiệm vụ bay nghiệp vụ (Mission Intent), chuỗi tọa độ mốc 3D (Waypoints), hành động tại mốc (Actions/Payload drop), kiểm tra an toàn vùng trời (Airspace Safety Check), sao chép nhiệm vụ (Duplicate) và chuyển đổi nhiệm vụ sang chuyến bay thực tế (Mission Execution).

---

## 7.1 Cấu Trúc Bảng Dữ Liệu

### Bảng `mission`
> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `code` | `varchar(50)` | `string` | UNIQUE, NULLABLE (Auto-gen) | Mã định danh nhiệm vụ (`MSN-YYMMDD-XXXX`) |
| `name` | `varchar(255)` | `string` | NOT NULL | Tên nhiệm vụ |
| `description` | `text` | `string` | NULLABLE | Mô tả chi tiết mục tiêu nhiệm vụ |
| `departure_hub_id` | `varchar(36)` | `string` | **FK** -> `hub.id`, NOT NULL | Bãi đáp khởi hành |
| `arrival_hub_id` | `varchar(36)` | `string` | **FK** -> `hub.id`, NOT NULL | Bãi đáp đích |
| `schedule_type` | `varchar(50)` | `MissionScheduleType` | NOT NULL, Default: `'IMMEDIATE'` | Kiểu lập lịch bay (`IMMEDIATE`, `SCHEDULED`) |
| `scheduled_at` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm dự kiến thực hiện (phải ở tương lai nếu SCHEDULED) |
| `status` | `varchar(50)` | `MissionStatus` | NOT NULL, Default: `'DRAFT'` | Trạng thái nhiệm vụ |

---

### Bảng `waypoint`
> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `mission_id` | `varchar(36)` | `string` | **FK** -> `mission.id`, NOT NULL | Thuộc nhiệm vụ nào |
| `sequence` | `integer` | `number` | NOT NULL | Thứ tự điểm mốc trong hành trình (bắt đầu từ 1) |
| `name` | `varchar(100)` | `string` | NULLABLE | Tên gợi nhớ của mốc |
| `latitude` | `double precision` | `number` | NOT NULL | Vĩ độ GPS (-90 đến 90) |
| `longitude` | `double precision` | `number` | NOT NULL | Kinh độ GPS (-180 đến 180) |
| `altitude` | `double precision` | `number` | NOT NULL | Cao độ bay so với mặt đất (AGL) hoặc MSL (mét > 0) |
| `actions` | `jsonb` | `Map<string, any>` | NULLABLE | Hành động tại mốc: `{ "type": "hover", "durationS": 10 }` |
| `conditions` | `jsonb` | `Map<string, any>` | NULLABLE | Điều kiện bay: `{ "maxSpeed": 15 }` |

---

### Bảng `mission_execution`
> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `mission_id` | `varchar(36)` | `string` | **FK** -> `mission.id`, NOT NULL | Thuộc nhiệm vụ nào |
| `current_waypoint_index` | `integer` | `number` | NOT NULL, Default: 0 | Chỉ số waypoint drone đang nhắm tới |
| `total_waypoints` | `integer` | `number` | NOT NULL | Tổng số waypoint của nhiệm vụ khi chạy |
| `completed_waypoints` | `integer` | `number` | NOT NULL, Default: 0 | Số waypoint đã bay qua thành công |
| `started_at` | `timestamptz` | `string (ISO 8601)` | NOT NULL | Thời điểm bắt đầu thực thi |
| `completed_at` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm kết thúc thực thi |
| `status` | `varchar(50)` | `ExecutionStatus` | NOT NULL, Default: `'IN_PROGRESS'` | Trạng thái thực thi |

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
  - Không cho phép xóa nhiệm vụ đang thực thi `EXECUTING` $\rightarrow$ `400 Bad Request` (`CANNOT_DELETE_EXECUTING_MISSION`).
  - Không tìm thấy nhiệm vụ $\rightarrow$ `404 Not Found` (`MISSION_NOT_FOUND`).
- **Phản hồi thành công**: `200 OK` - `{ "message": "Mission deleted successfully" }`.

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
Lấy chi tiết tiến trình thực thi của một lượt chạy cụ thể theo ID.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `MissionExecutionVm`.
- **Phản hồi lỗi**: `404 Not Found` (`MISSION_EXECUTION_NOT_FOUND`).
