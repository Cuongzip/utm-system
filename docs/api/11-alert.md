# 11. MODULE ALERTS (Thực thể: `Alert`)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Tiếp nhận, chuẩn hóa, phân loại mức độ rủi ro, quản lý vòng đời (Acknowledge / Resolve) và phát sóng cảnh báo khẩn cấp tức thời (Real-time Safety Alerting) phục vụ giám sát không lưu và trung tâm chỉ huy tác chiến (Tactical Operations Center).

---

## 11.1 Cấu Trúc Bảng Dữ Liệu (`alert`)

> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

### Các Cột Nghiệp Vụ Riêng Biệt (Domain Columns)

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `alert_type` | `varchar(50)` | `AlertType` | NOT NULL | Mã loại cảnh báo chuẩn hóa (`CONFLICT_PROXIMITY`, `AIRSPACE_BREACH`, `BATTERY_CRITICAL`, `EMERGENCY_INCIDENT`, ...) |
| `severity` | `varchar(20)` | `AlertSeverity` | NOT NULL, Default: `'HIGH'` | Mức độ nghiêm trọng (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) |
| `status` | `varchar(30)` | `AlertStatus` | NOT NULL, Default: `'ACTIVE'` | Trạng thái duy nhất của cảnh báo (`ACTIVE`, `ACKNOWLEDGED`, `RESOLVED`, `DISMISSED`) |
| `drone_id` | `varchar(36)` | `string` | NULLABLE | Drone phát sinh cảnh báo |
| `flight_id` | `varchar(36)` | `string` | NULLABLE | Chuyến bay phát sinh cảnh báo |
| `hub_id` | `varchar(36)` | `string` | NULLABLE | Trạm bãi đáp phát sinh cảnh báo |
| `conflict_id` | `varchar(36)` | `string` | NULLABLE, Index | Xung đột nguồn (dùng để tự động giải tỏa cảnh báo khi xung đột được xử lý) |
| `incident_id` | `varchar(36)` | `string` | NULLABLE, Index | Sự cố khẩn cấp nguồn (dùng để tự động giải tỏa cảnh báo khi sự cố đóng) |
| `message` | `text` | `string` | NOT NULL | Thông điệp cảnh báo ngắn gọn |
| `details_json` | `jsonb` | `Record<string, unknown>` | NULLABLE | Dữ liệu đo đạc chi tiết JSONB (tọa độ, dung lượng pin, thông số vi phạm) |
| `acknowledged_at` | `timestamptz` | `ZonedDateTime` | NULLABLE | Thời điểm xác nhận |
| `acknowledged_by` | `varchar(100)` | `string` | NULLABLE | Người xác nhận cảnh báo |
| `resolved_at` | `timestamptz` | `ZonedDateTime` | NULLABLE | Thời điểm giải quyết |
| `resolved_by` | `varchar(100)` | `string` | NULLABLE | Người/Hệ thống xử lý |
| `resolution_notes` | `text` | `string` | NULLABLE | Ghi chú biện pháp khắc phục |

---

## 11.2 Các Enum Định Nghĩa

### `AlertSeverity`
```typescript
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
```

### `AlertStatus`
```typescript
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
```

### `AlertType`
```typescript
export type AlertType =
  | "LATERAL_CORRIDOR_BREACH"
  | "VERTICAL_ALTITUDE_BREACH"
  | "3D_VOLUME_BREACH"
  | "C2_LINK_LOST"
  | "C2_LINK_LOST_CONTINGENT"
  | "NO_TELEMETRY_STREAM"
  | "RECOVERY_CONFORMANT"
  | "BATTERY_LOW"
  | "BATTERY_CRITICAL"
  | "GEOFENCE_BREACH"
  | "WEATHER_HAZARD"
  | "CONFLICT_PROXIMITY"
  | "CONFLICT"
  | "EQUIPMENT"
  | "COMMUNICATION"
  | "AIRSPACE"
  | "WEATHER"
  | "FLEET"
  | "HUB"
  | "SECURITY"
  | "SYSTEM_FAULT"
  | "MANUAL_ALERT"
  | "OTHER";
```

---

## 11.3 Giao Thức STOMP WebSocket

- **WebSocket Endpoint**: `/ws` (hỗ trợ SockJS fallback tại `/ws`).
- **Application Destination Prefix**: `/app`
- **Broker Prefix**: `/topic`
- **Kênh phát sóng (Broadcast Topics)**:
  - `/topic/alerts/live`: Toàn bộ cảnh báo hệ thống được tạo mới, xác nhận (acknowledged) hoặc giải tỏa (resolved).
  - `/topic/alerts/critical`: Chỉ phát sóng cảnh báo có cấp độ `CRITICAL` (phục vụ còi báo động ATC / HUD khẩn nguy).
  - `/topic/alerts/drone/{droneId}`: Cảnh báo riêng liên kết với một máy bay không người lái cụ thể.
  - `/topic/alerts/flight/{flightId}`: Cảnh báo riêng liên kết với một chuyến bay cụ thể.

---

## 11.4 Chi Tiết Từng Endpoint

### 11.4.1 `POST /api/v1/alerts`
Phát sinh cảnh báo an toàn mới từ các dịch vụ vệ tinh (Conflict Watchdog, Conformance Checker, Battery Watcher) hoặc nhập thủ công từ kiểm soát viên/phi công.

- **Chỉ định role**: `admin, hub_operator, pilot`
- **Input (Request Body)** - Model: `AlertPostVm`:
  ```json
  {
    "alertType": "CONFLICT_PROXIMITY",
    "severity": "CRITICAL",
    "droneId": "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "flightId": "f1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "hubId": "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "message": "CPA Breach: Drone distance < 15m with Drone B",
    "detailsJson": "{\"separationM\": 12.5, \"tcpaSec\": 8}"
  }
  ```
- **Logic xử lý cốt lõi**:
  1. Map dữ liệu từ `AlertPostVm`, tự động gán mặc định `severity = AlertSeverity.HIGH` (nếu null/trống).
  2. Gán trạng thái ban đầu: `status = AlertStatus.ACTIVE`, `acknowledged = false`, `resolved = false`.
  3. Gán `createdBy` từ SecurityContext hiện tại (fallback `"SYSTEM"` nếu unauthenticated).
  4. Lưu bản ghi vào bảng `alert`.
  5. Phát sóng WebSocket tới topic `/topic/alerts/live`, và có điều kiện tới `/topic/alerts/critical`, `/topic/alerts/drone/{droneId}`, `/topic/alerts/flight/{flightId}`.
- **Phản hồi thành công**: `201 Created` - Model: `AlertVm`.

---

### 11.4.2 `GET /api/v1/alerts`
Lấy danh sách các cảnh báo an toàn có phân trang và bộ lọc đa tiêu chí (sắp xếp giảm dần theo `createdOn`).

- **Chỉ định role**: Authenticated
- **Input (Query Params)**:
  - `droneId` (string, optional): Lọc theo UUID của drone.
  - `flightId` (string, optional): Lọc theo UUID của chuyến bay.
  - `severity` (string, optional): Lọc theo mức độ nghiêm trọng (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  - `acknowledged` (boolean, optional): Lọc theo trạng thái đã xác nhận hay chưa.
  - `resolved` (boolean, optional): Lọc theo trạng thái đã giải quyết hay chưa.
  - `alertType` (string, optional): Lọc theo mã loại cảnh báo.
  - `pageNo` (int, default `0`): Chỉ số trang (0-based).
  - `pageSize` (int, default `20`): Số lượng bản ghi mỗi trang (tối đa 100).
  - `limit` (int, optional): Nếu được cung cấp và > 0, sẽ ghi đè `pageSize`.
- **Phản hồi thành công**: `200 OK` - Model: `AlertListVm`:
  ```json
  {
    "content": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "alertType": "CONFLICT_PROXIMITY",
        "severity": "CRITICAL",
        "status": "ACTIVE",
        "droneId": "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "flightId": "f1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "hubId": "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "message": "CPA Breach: Drone distance < 15m with Drone B",
        "detailsJson": "{\"separationM\": 12.5, \"tcpaSec\": 8}",
        "acknowledged": false,
        "acknowledgedAt": null,
        "acknowledgedBy": null,
        "resolved": false,
        "resolvedAt": null,
        "resolvedBy": null,
        "resolutionNotes": null,
        "createdOn": "2026-11-06T10:15:30Z",
        "createdBy": "SYSTEM",
        "lastModifiedOn": "2026-11-06T10:15:30Z",
        "lastModifiedBy": "SYSTEM"
      }
    ],
    "pageNo": 0,
    "pageSize": 20,
    "totalElements": 1,
    "totalPages": 1,
    "isLast": true
  }
  ```

---

### 11.4.3 `GET /api/v1/alerts/active`
Lấy toàn bộ các cảnh báo đang mở và chưa được giải quyết (`resolved = false`), sắp xếp theo thời gian tạo mới nhất trước.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `List<AlertVm>`.

---

### 11.4.4 `GET /api/v1/alerts/{id}`
Lấy thông tin chi tiết một cảnh báo theo UUID.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `AlertVm`.
- **Lỗi nghiệp vụ**: `404 Not Found` (mã lỗi `ALERT_NOT_FOUND`) nếu ID không tồn tại.

---

### 11.4.5 `POST /api/v1/alerts/{id}/acknowledge` (Hỗ trợ cả `PATCH`)
Kiểm soát viên hoặc toán trưởng vận hành xác nhận đã tiếp nhận và đang giám sát cảnh báo.

- **Chỉ định role**: `admin, atc, hub_operator`
- **Input (Request Body, optional)** - Model: `AlertAcknowledgePostVm`:
  ```json
  {
    "note": "Operator tracking incident, informed remote pilot",
    "acknowledgedBy": "john_operator"
  }
  ```
- **Xử lý**:
  1. Kiểm tra tồn tại bản ghi cảnh báo (ném `NotFoundException` nếu không tìm thấy).
  2. Cập nhật `acknowledged = true`, `acknowledgedAt = now()`.
  3. Gán `acknowledgedBy` từ body (nếu có) hoặc SecurityContext hiện tại (fallback `"SYSTEM"`).
  4. Nếu `status == ACTIVE`, chuyển sang `ACKNOWLEDGED`.
  5. Nếu có `note`, nối thêm vào `resolutionNotes`.
  6. Lưu DB và phát sóng cập nhật qua WebSocket (`/topic/alerts/live`, v.v.).
- **Phản hồi thành công**: `200 OK` - Model: `AlertVm`.
- **Lỗi nghiệp vụ**: `404 Not Found` nếu ID không tồn tại.

---

### 11.4.6 `POST /api/v1/alerts/{id}/resolve` (Hỗ trợ cả `PATCH`)
Đánh dấu cảnh báo đã được giải tỏa an toàn (ví dụ: máy bay đã hạ độ cao, tái lập khoảng cách an toàn, hoặc pin đã sạc).

- **Chỉ định role**: `admin, atc, hub_operator`
- **Input (Request Body, optional)** - Model: `AlertResolvePostVm`:
  ```json
  {
    "resolutionNotes": "Drone climbed to 120m, separation restored to 85m",
    "resolvedBy": "operator_alex"
  }
  ```
- **Xử lý**:
  1. Kiểm tra tồn tại bản ghi cảnh báo (ném `NotFoundException` nếu không tìm thấy).
  2. Cập nhật `resolvedAt = now()`, `status = AlertStatus.RESOLVED`.
  3. Gán `resolvedBy` từ body (nếu có) hoặc SecurityContext hiện tại (fallback `"SYSTEM"`).
  4. Nếu có `resolutionNotes`, nối thêm vào ghi chú giải pháp.
  5. Lưu DB và phát sóng cập nhật qua WebSocket.
- **Phản hồi thành công**: `200 OK` - Model: `AlertVm`.
- **Lỗi nghiệp vụ**: `404 Not Found` nếu ID không tồn tại.

---

### 11.4.7 `POST /api/v1/alerts/resolve-by-conflict/{conflictId}` & `POST /api/v1/alerts/resolve-by-incident/{incidentId}`
Tự động đóng toàn bộ cảnh báo đang mở (`status <> RESOLVED`) gắn với một xung đột hoặc sự cố khẩn cấp nguồn.

- **Chỉ định role**: `admin, atc, hub_operator, pilot`
- **Phản hồi thành công**: `200 OK` - `{ "conflictId" | "incidentId": "...", "resolvedCount": 1 }`.
