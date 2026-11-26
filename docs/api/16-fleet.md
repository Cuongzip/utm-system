# 16. MODULE FLEET ORCHESTRATION (Thực thể: `FleetConfiguration`, `FleetAssignment`, `RebalancingTask`)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Điều phối đội bay thông minh trên quy mô đa trạm (Multi-Hub Fleet Orchestration): chấm điểm xếp hạng lựa chọn Drone tối ưu theo 5 trọng số (`proximity`, `battery`, `capability`, `utilization`, `maintenance`), quản lý quyết định phân công nhiệm vụ (`FleetAssignment`), và tự động đề xuất / phê duyệt / điều động bay chuyển trạm cân bằng tải đội bay (`RebalancingTask`).

---

## 16.1 Cấu Trúc Bảng Dữ Liệu (Database: `utm_fleet`)

> **Kế thừa kiểm toán**: Toàn bộ các bảng kế thừa từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

### 16.1.1 Bảng `fleet_configuration`
Lưu trữ các cấu hình trọng số chấm điểm và ngưỡng cân bằng đội bay (khởi tạo sẵn 4 preset chuẩn: `Balanced Mode`, `Rapid Response`, `Battery Priority`, `Fleet Longevity`).

| Tên Cột DB | Kiểu DB | Kiểu DTO | Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `varchar(120)` | `string` | NOT NULL, **UNIQUE** | Tên bộ cấu hình điều phối |
| `description` | `text` | `string` | NULLABLE | Mô tả mục tiêu chiến lược điều phối |
| `weights` | `jsonb` | `ScoringWeightsVm` | NOT NULL | Bộ 5 trọng số chấm điểm (tổng bằng `1.0`) |
| `thresholds` | `jsonb` | `RebalanceThresholdsVm` | NOT NULL | Ngưỡng dự trữ tối thiểu mỗi Hub, pin tối thiểu chuyển trạm, cooldown |
| `is_preset` | `boolean` | `boolean` | NOT NULL, Default: `false` | Đánh dấu preset gốc của hệ thống (không thể xóa) |
| `is_active` | `boolean` | `boolean` | NOT NULL, Default: `false` | Đánh dấu cấu hình đang được kích hoạt toàn cục |

### 16.1.2 Bảng `fleet_assignment`
Lưu lịch sử chấm điểm và quyết định gán phương tiện bay cho nhiệm vụ.

| Tên Cột DB | Kiểu DB | Kiểu DTO | Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `mission_id` | `varchar(36)` | `string` | NOT NULL, Index | Nhiệm vụ được chấm điểm phân công |
| `drone_id` | `varchar(36)` | `string` | NULLABLE, Index | Phương tiện bay được chọn |
| `scores` | `jsonb` | `FactorScoresVm` | NOT NULL | Điểm chi tiết từng tiêu chí (thang 0 - 100) |
| `weights` | `jsonb` | `ScoringWeightsVm` | NOT NULL | Bộ trọng số áp dụng tại thời điểm chấm |
| `final_score` | `double precision` | `number` | NOT NULL | Điểm tổng hợp có trọng số |
| `status` | `varchar(30)` | `AssignmentStatus` | NOT NULL, Default: `'PENDING'` | Trạng thái phân công (`PENDING`, `ACCEPTED`, `REJECTED`, `COMPLETED`, `CANCELLED`) |
| `assigned_by` | `varchar(30)` | `string` | NOT NULL | Nguồn gán (`SYSTEM` hoặc `OPERATOR`) |
| `operator_id` | `varchar(100)` | `string` | NULLABLE | Định danh điều hành viên xác nhận/từ chối |
| `alternative_drones` | `jsonb` | `CandidateScoreVm[]` | NULLABLE | Danh sách ứng viên dự phòng xếp hạng kế tiếp |
| `rejection_reason` | `text` | `string` | NULLABLE | Lý do từ chối gợi ý phân công |
| `assigned_at` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm phân công |
| `completed_at` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm hoàn tất |

### 16.1.3 Bảng `rebalancing_task`
Quản lý tác vụ điều động Drone rỗng bay chuyển trạm từ Hub dư thừa (`source_hub_id`) sang Hub thiếu hụt (`target_hub_id`). Tự động lắng nghe Kafka `utm.flight.events` (`FLIGHT_COMPLETED`) để chuyển trạng thái sang `COMPLETED`.

| Tên Cột DB | Kiểu DB | Kiểu DTO | Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `source_hub_id` | `varchar(36)` | `string` | NOT NULL | Trạm xuất phát nhường phương tiện |
| `target_hub_id` | `varchar(36)` | `string` | NOT NULL | Trạm đích đang thiếu hụt phương tiện |
| `drone_id` | `varchar(36)` | `string` | NOT NULL, Index | Phương tiện thực hiện bay chuyển trạm |
| `repositioning_mission_id` | `varchar(36)` | `string` | NULLABLE | Nhiệm vụ chuyển trạm tự sinh (nếu có) |
| `repositioning_flight_id` | `varchar(36)` | `string` | NULLABLE | Chuyến bay chuyển trạm tự sinh tại `flight` service |
| `trigger_type` | `varchar(40)` | `string` | NOT NULL | Nguồn kích hoạt (`THRESHOLD_BREACH`, `OPERATOR_MANUAL`, `PREDICTIVE_DEMAND`) |
| `rule` | `jsonb` | `Record<string, unknown>` | NOT NULL | Thông số vi phạm ngưỡng tại thời điểm tạo |
| `status` | `varchar(30)` | `RebalancingStatus` | NOT NULL, Default: `'PENDING'` | `PENDING`, `APPROVED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `FAILED` |
| `priority` | `integer` | `number` | NOT NULL, Default: `1` | Độ ưu tiên điều động |
| `approved_by` | `varchar(100)` | `string` | NULLABLE | Người phê duyệt điều động |
| `approved_at` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm phê duyệt |
| `started_at` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm bắt đầu bay chuyển trạm |
| `completed_at` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm hoàn thành |

---

## 16.2 Chi Tiết Các Nhóm Endpoint (`/api/v1/fleet`)

### 16.2.1 Giám Sát Tổng Quan & Năng Lực Trạm
- **`GET /api/v1/fleet/overview`** *(Authenticated)*: Tổng hợp số lượng Drone toàn hệ thống theo trạng thái, sức khỏe đội bay và phân bố từng Hub.
- **`GET /api/v1/fleet/hubs/{hubId}/status`** & **`GET /api/v1/fleet/hubs/{hubId}/drones`** *(Authenticated)*: Thống kê năng lực tiếp nhận và danh sách Drone đang đỗ tại một Hub.
- **`GET /api/v1/fleet/available`** *(Authenticated)*: Ma trận sẵn sàng bay của đội bay (`?hubId=...`).

### 16.2.2 Chấm Điểm 5 Nhân Tố & Phân Công Nhiệm Vụ
- **`POST /api/v1/fleet/assign`** *(`admin, hub_operator, pilot, atc`)*: Chấm điểm toàn bộ Drone khả dụng cho một `missionId` và tạo bản ghi `FleetAssignment` cho ứng viên điểm cao nhất.
  ```json
  {
    "missionId": "a4444444-4444-4444-8444-444444444444",
    "autoAccept": false
  }
  ```
  **Phản hồi `200 OK`** (`AssignmentResultVm`):
  ```json
  {
    "assignment": {
      "id": "fa200000-0000-4000-8000-000000000002",
      "missionId": "a4444444-4444-4444-8444-444444444444",
      "droneId": "7633fbe9-411a-4767-94bb-a1d818b7f26f",
      "finalScore": 90.3,
      "status": "pending"
    }
  }
  ```
- **`GET /api/v1/fleet/assignments/mission/{missionId}`** *(Authenticated)*: Truy vấn lịch sử quyết định phân công cho một nhiệm vụ.
- **`POST /api/v1/fleet/assignments/{id}/accept`** & **`POST /api/v1/fleet/assignments/{id}/reject`** *(`admin, hub_operator, pilot, atc`)*: Chấp thuận hoặc từ chối gợi ý phân công phương tiện.

### 16.2.3 Cân Bằng Đội Bay Liên Trạm (Rebalancing)
- **`GET /api/v1/fleet/rebalancing/analyze`** *(Authenticated)*: Phân tích lệch cung - cầu giữa các Hub và đề xuất danh sách cặp `(sourceHub -> targetHub, droneId)` đảm bảo `minDonorReserve` và `minBatteryForReposition`.
- **`GET /api/v1/fleet/rebalancing/pending`**, **`GET /api/v1/fleet/rebalancing/active`**, **`GET /api/v1/fleet/rebalancing/history`** *(Authenticated)*: Truy vấn các tác vụ chuyển trạm đang chờ duyệt, đang triển khai hoặc lịch sử.
- **`POST /api/v1/fleet/rebalancing`** *(`admin, hub_operator, atc`)*: Khởi tạo thủ công một bản ghi `RebalancingTask` ở trạng thái `PENDING`.
- **`POST /api/v1/fleet/rebalancing/{id}/approve`**, **`POST /api/v1/fleet/rebalancing/{id}/execute`**, **`POST /api/v1/fleet/rebalancing/{id}/cancel`**, **`POST /api/v1/fleet/rebalancing/{id}/complete`** *(`admin, hub_operator, atc`)*: Phê duyệt, kích hoạt sinh chuyến bay chuyển trạm, hủy hoặc hoàn tất tác vụ.

### 16.2.4 Quản Lý Cấu Hình Trọng Số
- **`GET /api/v1/fleet/config`**, **`GET /api/v1/fleet/config/all`**, **`GET /api/v1/fleet/config/{id}`** *(Authenticated)*: Lấy cấu hình đang kích hoạt, toàn bộ danh sách preset/cấu hình tùy chỉnh hoặc chi tiết theo ID.
- **`POST /api/v1/fleet/config`**, **`PUT /api/v1/fleet/config/{id}`**, **`POST /api/v1/fleet/config/{id}/activate`** *(`admin, hub_operator`)*: Tạo mới, cập nhật trọng số (tổng 5 trọng số bằng `1.0`, các preset gốc không thể sửa) và kích hoạt làm cấu hình mặc định.
