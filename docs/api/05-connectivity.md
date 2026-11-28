# 05. MODULE CONNECTIVITY (Thực thể: `DeviceRegistration`)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Quản lý định danh phần cứng bay (IMEI / MAC / Secure Chip), giám sát nhịp tim kết nối (Heartbeat), trạng thái trực tuyến (Online/Offline) và phiên WebSocket Datalink C2.

---

## 5.1 Cấu Trúc Bảng Dữ Liệu (`device_registrations`)

> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

### Các Cột Nghiệp Vụ Riêng Biệt (Domain Columns)

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `drone_id` | `varchar(36)` | `string` | NULLABLE, Partial UNIQUE (`WHERE drone_id IS NOT NULL AND registration_status <> 'REVOKED'`) | Khóa tham chiếu 1 - 1 với Drone (NULL đối với `GATEWAY` hoặc `GCS`) |
| `hub_id` | `varchar(36)` | `string` | NULLABLE, Index | Trạm Vertiport quản lý thiết bị trạm mặt đất |
| `device_type` | `varchar(30)` | `DeviceType` | NOT NULL, Default: `'DRONE'` | Phân loại thiết bị (`DRONE`, `GATEWAY`, `GCS`) |
| `device_identifier` | `varchar(100)` | `string` | NOT NULL, Partial UNIQUE (`WHERE registration_status <> 'REVOKED'`) | Mã phần cứng duy nhất (IMEI, MAC, hoặc Chip ID) |
| `registration_status` | `varchar(30)` | `DeviceRegistrationStatus` | NOT NULL, Default: `'ACTIVE'` | Trạng thái đăng ký thiết bị (`PENDING`, `ACTIVE`, `REVOKED`) |
| `connection_status` | `varchar(50)` | `DeviceConnectionStatus` | NOT NULL, Default: `'OFFLINE'` | Trạng thái kết nối thực tế (`OFFLINE`, `ONLINE`, `CONNECTING`) |
| `telemetry_mode` | `varchar(30)` | `TelemetryRateMode` | NOT NULL, Default: `'NORMAL'` | Chế độ tần số phát viễn trắc thích ứng (`IDLE`, `NORMAL`, `ENHANCED`, `EMERGENCY`) |
| `telemetry_mode_reason` | `varchar(255)` | `string` | NULLABLE | Lý do chuyển đổi tần số phát tự động/thủ công |
| `supported_protocols` | `jsonb` | `string[]` | NULLABLE | Danh sách giao thức hỗ trợ (`websocket`, `mqtt`, `mavlink`, `rest`) |
| `metadata` | `jsonb` | `Record<string, unknown>` | NULLABLE | Thông tin firmware, modem 5G/SatCom |
| `socket_id` | `varchar(100)` | `string` | NULLABLE | ID phiên kết nối WebSocket Gateway hiện tại |
| `certificate_fingerprint` | `varchar(128)` | `string` | NULLABLE | Chuỗi vân tay SHA-256 chứng thư X.509 thiết bị |
| `last_seen_at` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm gửi tín hiệu nhịp tim gần nhất |
| `version` | `bigint` | — | NOT NULL, Default: `0` | Optimistic Locking (`@Version`) |

### Bảng Phụ Trợ PKI & OEM Integration
- **`device_certificates`** *(kế thừa `AbstractAuditEntity`)*: Quản lý chứng thư số X.509 RSA-2048 cấp bởi UTM Root CA (`device_registration_id`, `certificate_pem`, `fingerprint`, `common_name`, `serial_number`, `issued_at`, `expires_at`, `revoked_at`, `revocation_reason`).
- **`manufacturer_api_keys`** *(kế thừa `AbstractAuditEntity`)*: Quản lý khóa tích hợp OEM đám mây (`name`, `manufacturer_name`, `key_prefix`, `key_hash` SHA-256, `scopes`, `is_active`, `expires_at`, `last_used_at`, `revoked_at`).

---

## 5.2 Các Enum Định Nghĩa

```typescript
export type DeviceConnectionStatus = "offline" | "online" | "connecting";
export type DeviceRegistrationStatus = "pending" | "active" | "revoked";
```

---

## 5.3 Mối Quan Hệ Liên Kết (Relationships)

- **`Drone` (1 - 1)**: Mỗi thiết bị Drone gắn liền với duy nhất 1 bản ghi phần cứng: `device_registrations.drone_id -> drone.id`.

---

## 5.4 Chi Tiết Từng Endpoint

### 5.4.1 `POST /api/v1/connectivity/devices/register`
Đăng ký ghép nối phần cứng thiết bị với máy bay Drone.

- **Chỉ định role**: `admin, hub_operator`
- **Input (Request Body)** - Model: `DeviceRegistrationPostVm`:
  ```json
  {
    "droneId": "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "deviceIdentifier": "DRONE-MAC-9876543210AB",
    "certificateFingerprint": "SHA256:7b91d24c88f910a3"
  }
  ```
- **Logic xử lý cốt lõi**:
  1. Kiểm tra tồn tại của Drone qua `DroneClientService`. Nếu không có $\rightarrow$ Trả về `404 Not Found`.
  2. Kiểm tra quan hệ 1-1: Drone này đã được đăng ký phần cứng chưa. Nếu có $\rightarrow$ Trả về `409 Conflict`.
  3. **Device Identifier Generation & Unique Check**:
     - Nếu `deviceIdentifier` bỏ trống hoặc null: Tự động sinh định danh duy nhất theo rule `DEVICE_IDENTIFIER` (`DEV-XXXXXXXX`, ví dụ `DEV-XGXYDEC5`).
     - Nếu người dùng nhập tay: Chuẩn hóa trim/uppercase và kiểm tra trùng lặp trong DB. Nếu đã được dùng cho drone khác $\rightarrow$ Trả về `409 Conflict`.
  4. Lưu bản ghi với `connection_status = 'offline'`, trả về DTO kèm thông tin làm giàu từ Drone (`droneRegistrationNumber`, `droneModel`).
- **Phản hồi thành công**: `201 Created` - Model: `DeviceRegistrationVm`:
  ```json
  {
    "id": "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "droneId": "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "droneRegistrationNumber": "VN-UAV-001",
    "droneModel": "Matrice 350 RTK",
    "deviceIdentifier": "DRONE-MAC-9876543210AB",
    "connectionStatus": "offline",
    "certificateFingerprint": "SHA256:7b91d24c88f910a3",
    "createdOn": "2026-10-10T08:00:00Z"
  }
  ```
- **Phản hồi lỗi**: `400 Bad Request`, `404 Not Found`, `409 Conflict`.

---

### 5.4.2 `GET /api/v1/connectivity/devices`
Lấy danh sách thiết bị kết nối có phân trang, tìm kiếm và lọc theo trạng thái.

- **Chỉ định role**: `admin, hub_operator`
- **Input (Query Params)**: `?connectionStatus=online&search=987654&limit=20&offset=0`
  - `search`: Tìm kiếm tự do theo `deviceIdentifier` hoặc `droneId`.
- **Phản hồi thành công**: `200 OK` - Model: `DeviceRegistrationListVm`:
  ```json
  {
    "items": [
      {
        "id": "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "droneId": "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "droneRegistrationNumber": "VN-UAV-001",
        "droneModel": "Matrice 350 RTK",
        "deviceIdentifier": "DRONE-MAC-9876543210AB",
        "connectionStatus": "online",
        "socketId": "ws-session-xyz-123",
        "lastSeenAt": "2026-10-10T08:30:05Z",
        "createdOn": "2026-10-10T08:00:00Z"
      }
    ],
    "total": 1
  }
  ```

---

### 5.4.3 `GET /api/v1/connectivity/devices/online`
Lấy danh sách các thiết bị đang online thực tế. Tự động kiểm tra timeout theo cơ chế Deadman-switch (nếu `last_seen_at < now() - 30s` thì tự động đổi sang `offline` và lưu DB).

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Danh sách `DeviceRegistrationVm[]`.

---

### 5.4.4 `GET /api/v1/connectivity/devices/{id}`
Lấy chi tiết cấu hình phần cứng thiết bị.
> **Tra cứu linh hoạt (Flexible Lookup)**: Tham số `{id}` hỗ trợ cả 3 loại khóa:
> - UUID của bản ghi đăng ký (`id`)
> - Mã phần cứng thiết bị (`deviceIdentifier`)
> - UUID của Drone (`droneId`)

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `DeviceRegistrationVm`.
- **Phản hồi lỗi**: `404 Not Found`.

---

### 5.4.5 `POST /api/v1/connectivity/devices/{id}/heartbeat`
Nhận tín hiệu nhịp tim (Heartbeat) định kỳ 5s - 10s từ thiết bị Drone IoT Gateway.
> Tham số `{id}` hỗ trợ tra cứu linh hoạt bằng `id`, `deviceIdentifier` hoặc `droneId`.

- **Chỉ định role**: Thiết bị IoT hoặc Authenticated
- **Input (Request Body)** - Model: `DeviceHeartbeatPostVm`:
  ```json
  {
    "socketId": "ws-session-xyz-123"
  }
  ```
- **Logic xử lý cốt lõi**:
  1. Tra cứu bản ghi theo `id`, `deviceIdentifier`, hoặc `droneId`. Nếu không có $\rightarrow$ Trả về `404 Not Found`.
  2. Cập nhật `connection_status = 'online'`.
  3. Cập nhật `last_seen_at = now()`.
  4. Cập nhật `socket_id` (nếu có) phục vụ định tuyến lệnh bay C2.
- **Phản hồi thành công**: `200 OK` - Model: `HeartbeatResultVm`:
  ```json
  {
    "success": true,
    "timestamp": "2026-10-10T08:30:10Z"
  }
  ```
- **Phản hồi lỗi**: `404 Not Found`.

---

### 5.4.6 `DELETE /api/v1/connectivity/devices/{id}`
Hủy bỏ liên kết phần cứng thiết bị.
> Tham số `{id}` hỗ trợ tra cứu linh hoạt bằng `id`, `deviceIdentifier` hoặc `droneId`.

- **Chỉ định role**: `admin`
- **Chốt chặn an toàn bay (Domain Safety Guard)**:
  - Tra cứu thông tin Drone liên đới qua `DroneClientService`.
  - Không cho phép hủy kết nối nếu Drone đang bay (`status == 'in_flight'` hoặc `'in_mission'`) $\rightarrow$ Ném `400 Bad Request`.
  - Thực hiện thu hồi mềm (**Soft-Revoke**): chuyển `registration_status = 'REVOKED'`, `connection_status = 'OFFLINE'`, xóa `socket_id` để bảo toàn lịch sử kiểm toán bảo mật.
- **Phản hồi thành công**: `200 OK` - Model: `RevokeResultVm`:
  ```json
  {
    "message": "Device registration revoked successfully"
  }
  ```
- **Phản hồi lỗi**: `400 Bad Request`, `404 Not Found`.

---

### 5.4.7 Nhóm PKI X.509, Adaptive Telemetry Rate & Command Router (`/api/v1/connectivity`)
- **`GET /api/v1/connectivity/ca-certificate`** *(Authenticated)*: Tải chứng thư gốc UTM Root CA (PEM).
- **`GET /api/v1/connectivity/devices/{id}/certificate`**, **`POST /api/v1/connectivity/devices/{id}/certificate/renew`**, **`POST /api/v1/connectivity/devices/{id}/certificate/revoke`** *(`admin, hub_operator`)*: Xem, cấp mới/gia hạn hoặc thu hồi chứng thư X.509 của thiết bị.
- **`GET /api/v1/connectivity/telemetry/modes`** *(Authenticated)*: Danh mục cấu hình tần số thích ứng (`IDLE: 0.033Hz`, `NORMAL: 0.5Hz`, `ENHANCED: 2.0Hz`, `EMERGENCY: 10.0Hz`).
- **`GET /api/v1/connectivity/devices/{id}/telemetry-mode`** *(Authenticated)*: Lấy chế độ tần số phát viễn trắc hiện tại của thiết bị (tra cứu linh hoạt `{id}` theo `id`, `deviceIdentifier` hoặc `droneId`; trả về `DeviceTelemetryModeVm` gồm `deviceId`, `deviceIdentifier`, `droneId`, `telemetryMode`, `telemetryModeReason`, `rateHz`, `intervalMs`, `updatedAt`).
- **`PUT /api/v1/connectivity/devices/{id}/telemetry-mode`** *(`admin, atc, hub_operator`)*: Chuyển chế độ tần số phát viễn trắc của thiết bị (cũng tự động nâng lên `EMERGENCY` khi nhận sự kiện khẩn cấp từ Kafka `utm.emergency.events`).
- **`GET /api/v1/connectivity/telemetry/stats`**, **`GET /api/v1/connectivity/protocols/stats`**, **`GET /api/v1/connectivity/commands/stats`**, **`GET /api/v1/connectivity/status`** *(Authenticated)*: Thống kê băng thông viễn trắc, phân bố giao thức, độ trễ định tuyến lệnh C2 (Kafka `utm.drone.commands` -> `utm.drone.command.acks`) và tổng quan sức khỏe kết nối.

---

### 5.4.8 Nhóm Cổng Tích Hợp Hãng Sản Xuất OEM (`/api/v1/integration`)
- **`POST /api/v1/integration/keys`**, **`GET /api/v1/integration/keys`**, **`POST /api/v1/integration/keys/{id}/revoke`** *(`admin` via JWT)*: Cấp khóa API OEM mới (trả về khóa gốc một lần duy nhất, lưu băm SHA-256), liệt kê và thu hồi khóa.
- **`POST /api/v1/integration/register`**, **`POST /api/v1/integration/telemetry`**, **`GET /api/v1/integration/status`** *(Xác thực qua header `X-API-Key`)*: Cho phép nền tảng đám mây của hãng chế tạo (DJI Cloud, Wingtra, Autel) tự động đăng ký thiết bị, đẩy luồng telemetry chuẩn hóa sang `telemetry` service và kiểm tra trạng thái tích hợp.
