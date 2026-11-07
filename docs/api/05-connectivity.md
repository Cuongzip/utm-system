# 05. MODULE CONNECTIVITY (Thực thể: `DeviceRegistration`)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Quản lý định danh phần cứng bay (IMEI / MAC / Secure Chip), giám sát nhịp tim kết nối (Heartbeat), trạng thái trực tuyến (Online/Offline) và phiên WebSocket Datalink C2.

---

## 5.1 Cấu Trúc Bảng Dữ Liệu (`device_registrations`)

> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

### Các Cột Nghiệp Vụ Riêng Biệt (Domain Columns)

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `drone_id` | `varchar(36)` | `string` | **FK** -> `drone.id`, **UNIQUE** | Khóa ngoại 1 - 1 với máy bay Drone |
| `device_identifier` | `varchar(100)` | `string` | NOT NULL, **UNIQUE** | Mã phần cứng duy nhất (IMEI, MAC hoặc Chip ID) |
| `connection_status` | `varchar(50)` | `DeviceConnectionStatus` | NOT NULL, Default: `'offline'` | Trạng thái kết nối thực tế |
| `socket_id` | `varchar(100)` | `string` | NULLABLE | ID phiên kết nối WebSocket Gateway hiện tại |
| `certificate_fingerprint` | `varchar(128)` | `string` | NULLABLE | Chuỗi vân tay chứng thư bảo mật thiết bị |
| `last_seen_at` | `timestamptz` | `string (ISO 8601)` | NULLABLE | Thời điểm gửi tín hiệu nhịp tim gần nhất |

---

## 5.2 Các Enum Định Nghĩa

```typescript
export type DeviceConnectionStatus = "offline" | "online" | "connecting";
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
- **Phản hồi thành công**: `200 OK` - Model: `RevokeResultVm`:
  ```json
  {
    "message": "Device registration revoked successfully"
  }
  ```
- **Phản hồi lỗi**: `400 Bad Request`, `404 Not Found`.
