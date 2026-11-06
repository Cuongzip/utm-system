# 03. MODULE HUBS (Thực thể: `Hub`)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Quản lý các trạm cất/hạ cánh, Vertiports, sân đỗ trên mái nhà và bãi đáp drone cố định. Định nghĩa tọa độ GPS tâm trạm, cao độ trắc địa (MSL), bán kính vùng đệm bảo vệ an toàn xung quanh trạm và kiểm soát năng lực tiếp nhận phương tiện.

---

## 3.1 Cấu Trúc Bảng Dữ Liệu (`hub`)

> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

### Các Cột Nghiệp Vụ Riêng Biệt (Domain Columns)

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `code` | `varchar(50)` | `string` | NOT NULL, **UNIQUE** | Mã định danh trạm (vd: `HUB-SGN-01`) |
| `name` | `varchar(255)` | `string` | NOT NULL | Tên hiển thị của Hub / Vertiport |
| `latitude` | `double precision` | `number` | NOT NULL | Vĩ độ GPS WGS84 (-90 đến 90) |
| `longitude` | `double precision` | `number` | NOT NULL | Kinh độ GPS WGS84 (-180 đến 180) |
| `altitude_msl` | `double precision` | `number` | NOT NULL | Độ cao trắc địa so với mực nước biển trung bình (mét) |
| `airspace_radius` | `double precision` | `number` | NOT NULL | Bán kính vùng đệm bảo vệ an toàn của trạm (mét) |
| `status` | `varchar(50)` | `HubStatus` | NOT NULL, Default: `'active'` | Trạng thái tiếp nhận bay của Hub |

---

## 3.2 Các Enum Định Nghĩa

```typescript
export type HubStatus =
  | "active"       // Trạm mở cửa đón/trả chuyến bay bình thường
  | "maintenance"  // Tạm dừng khai thác để bảo trì hạ tầng/sạc điện
  | "closed";      // Đóng cửa hoàn toàn / ngưng sử dụng
```

---

## 3.3 Mối Quan Hệ Liên Kết (Relationships)

- **`Drone` (1 - N)**: Trạm căn cứ lưu trú của Drone `drone.home_hub_id -> hub.id`.
- **`AirspaceZone` (1 - N)**: Vùng bảo vệ hoặc khu vực hạn chế gắn với trạm `airspace_zone.hub_id -> hub.id`.
- **`Mission` (1 - N)**: Bãi đi (`departure_hub_id`) và bãi đến (`arrival_hub_id`).
- **`Flight` (1 - N)**: Điểm cất cánh và hạ cánh thực tế của chuyến bay.

---

## 3.4 Chi Tiết Từng Endpoint

### 3.4.1 `POST /api/v1/hubs`
Đăng ký mới một Hub / Vertiport vào hệ thống.

- **Chỉ định role**: `admin`
- **Input (Request Body)** - Model: `HubPostVm`:
  ```json
  {
    "code": "HUB-SGN-01",
    "name": "Central Vertiport Hub D1",
    "location": {
      "latitude": 10.7769,
      "longitude": 106.7009
    },
    "altitudeMsl": 12.5,
    "airspaceRadius": 1500.0
  }
  ```
- **Logic xử lý cốt lõi**:
  1. **Validation**: Kiểm tra `code`, `name`, tọa độ hợp lệ, bán kính > 0.
  2. **Check Unique**: `code` chưa tồn tại trong hệ thống. Nếu đã có $\rightarrow$ Trả về `409 Conflict`.
  3. **Khởi tạo**: Gán `status = 'active'`, tự động sinh UUID `id`.
- **Phản hồi thành công**: `201 Created` - Model: `HubVm`:
  ```json
  {
    "id": "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "code": "HUB-SGN-01",
    "name": "Central Vertiport Hub D1",
    "location": {
      "latitude": 10.7769,
      "longitude": 106.7009
    },
    "altitudeMsl": 12.5,
    "airspaceRadius": 1500.0,
    "status": "active",
    "createdOn": "2026-10-10T08:00:00Z"
  }
  ```
- **Phản hồi lỗi**: `400 Bad Request`, `409 Conflict`.

---

### 3.4.2 `GET /api/v1/hubs`
Lấy danh sách Hubs có phân trang và bộ lọc.

- **Chỉ định role**: Authenticated
- **Input (Query Params)**: `?status=active&search=Central&limit=20&offset=0`
- **Phản hồi thành công**: `200 OK` - Model: `HubListVm`:
  ```json
  {
    "items": [
      {
        "id": "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "code": "HUB-SGN-01",
        "name": "Central Vertiport Hub D1",
        "location": {
          "latitude": 10.7769,
          "longitude": 106.7009
        },
        "altitudeMsl": 12.5,
        "airspaceRadius": 1500.0,
        "status": "active",
        "createdOn": "2026-10-10T08:00:00Z"
      }
    ],
    "total": 1
  }
  ```

---

### 3.4.3 `GET /api/v1/hubs/{id}`
Lấy chi tiết thông số kỹ thuật của một Hub theo UUID.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `HubVm`.
- **Phản hồi lỗi**: `404 Not Found`.

---

### 3.4.4 `PUT /api/v1/hubs/{id}`
Cập nhật thông tin và trạng thái trạm.

- **Chỉ định role**: `admin, hub_operator`
- **Input (Request Body)** - Model: `HubPutVm`:
  ```json
  {
    "name": "Central Vertiport Hub D1 (Expansion)",
    "altitudeMsl": 15.0,
    "airspaceRadius": 2000.0,
    "status": "maintenance"
  }
  ```
- **Ràng buộc an toàn bay**: Nếu trạm chuyển sang `maintenance` hoặc `closed`, hệ thống kiểm tra và cảnh báo nếu có chuyến bay đang cất cánh hoặc dự kiến hạ cánh tại trạm.
- **Phản hồi thành công**: `200 OK` - Model: `HubVm`.
- **Phản hồi lỗi**: `400 Bad Request`, `404 Not Found`.

---

### 3.4.5 `DELETE /api/v1/hubs/{id}`
Vô hiệu hóa trạm (chuyển sang `closed`).

- **Chỉ định role**: `admin`
- **Chốt chặn an toàn bay**: Gọi `FlightClientService` xác minh không có chuyến bay nào đang `ACTIVE` hoặc `SCHEDULED` tới trạm này.
- **Xử lý**: Cập nhật `status = 'closed'`.
- **Phản hồi thành công**: `204 No Content` / `200 OK`.

