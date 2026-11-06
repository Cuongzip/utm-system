# 4. MODULE AIRSPACE (Thực thể: `AirspaceZone`)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Quản lý không phận, vùng cấm bay tuyệt đối (No-Fly Zone - NFZ), vùng hạn chế (Restricted), hành lang an toàn vào bãi (Hub Corridor) và thuật toán kiểm tra Geofence 3D/4D.

---

## 4.1 Cấu Trúc Bảng Dữ Liệu (`airspace_zone`)

> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

### Các Cột Nghiệp Vụ Riêng Biệt (Domain Columns)

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `varchar(255)` | `string` | NOT NULL, **UNIQUE** | Tên định danh vùng không phận |
| `hub_id` | `varchar(36)` | `string` | **FK** -> `hub.id`, NULLABLE | Thuộc Hub nào (NULL nếu là vùng cấm cấp quốc gia) |
| `zone_type` | `varchar(50)` | `AirspaceZoneType` | NOT NULL | Phân loại vùng không phận |
| `geometry` | `text` | `GeoJsonPolygonVm` | NOT NULL | Tọa độ đa giác bao quanh vùng trời (GeoJSON Polygon Object) |
| `altitude_ceiling` | `double precision` | `number` | NOT NULL, Default: `120.0` | Trần bay tối đa cho phép (mét) |
| `status` | `varchar(50)` | `AirspaceZoneStatus` | NOT NULL, Default: `'active'` | Trạng thái hiệu lực |
| `description` | `text` | `string` | NULLABLE | Mô tả chi tiết lý do hạn chế / quy định bay |

---

## 4.2 Các Enum Định Nghĩa

```typescript
export type AirspaceZoneType =
  | "no_fly_zone"   // Vùng cấm bay tuyệt đối (khu quân sự, cơ quan đầu não, sân bay dân dụng)
  | "restricted"    // Vùng hạn chế (yêu cầu cấp phép đặc biệt từ ATC)
  | "hub_corridor"  // Hành lang bay an toàn dẫn vào Vertiport
  | "warning";      // Khu vực cảnh báo chướng ngại vật / thời tiết xấu

export type AirspaceZoneStatus = "active" | "inactive";
```

---

## 4.3 Mối Quan Hệ Liên Kết (Relationships)

- **`Hub` (N - 1)**: Hành lang tiếp cận thuộc một bãi đáp `airspace_zone.hub_id -> hub.id`.

---

## 4.4 Chi Tiết Từng Endpoint

### 4.4.1 `POST /api/v1/airspace/check`
Kiểm tra nhanh một tọa độ 3D có vi phạm không phận cấm/hạn chế hoặc trần bay hay không.

- **Chỉ định role**: Authenticated
- **Input (Request Body)** - Model: `AirspaceCheckVm`:
  ```json
  {
    "lat": 10.7780,
    "lon": 106.7020,
    "alt": 85.0
  }
  ```
- **Phản hồi thành công**: `200 OK` - Model: `AirspaceCheckResultVm`:
  ```json
  {
    "safe": false,
    "violations": [
      {
        "zoneId": "z1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "name": "Khu vực Cấm bay Dinh Độc Lập",
        "zoneType": "no_fly_zone",
        "reason": "Point falls inside strictly forbidden airspace"
      }
    ]
  }
  ```
- **Phản hồi lỗi**: `400 Bad Request`.

---

### 4.4.2 `POST /api/v1/airspace/check-path`
Kiểm tra toàn bộ chuỗi tọa độ mốc bay (LineString trajectory) bằng cách lấy mẫu các điểm theo cự ly `spacingM` để phát hiện giao cắt với vùng cấm/hạn chế.

- **Chỉ định role**: Authenticated
- **Input (Request Body)** - Model: `AirspaceCheckPathVm`:
  ```json
  {
    "points": [
      { "lat": 10.770, "lon": 106.700, "alt": 60.0 },
      { "lat": 10.780, "lon": 106.710, "alt": 80.0 }
    ],
    "spacingM": 200.0
  }
  ```
- **Phản hồi thành công**: `200 OK` - Model: `AirspaceCheckPathResultVm`:
  ```json
  {
    "safe": false,
    "violations": [
      {
        "zoneId": "z1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "name": "Khu vực Cấm bay Dinh Độc Lập",
        "zoneType": "no_fly_zone",
        "altitudeCeiling": 120.0,
        "conflictPoint": {
          "lat": 10.775,
          "lon": 106.705,
          "alt": 70.0
        },
        "segmentIndex": 0,
        "distanceFromStartM": 450.0,
        "reason": "Trajectory intersects strictly forbidden airspace 'Khu vực Cấm bay Dinh Độc Lập'"
      }
    ]
  }
  ```
- **Phản hồi lỗi**: `400 Bad Request`.

---

### 4.4.3 `GET /api/v1/airspace/zones`
Lấy danh sách các vùng không phận có phân trang và bộ lọc.

- **Chỉ định role**: Authenticated
- **Input (Query Params)**: `?hubId=h1b2c3d4-e5f6-7890-abcd-ef1234567890&zoneType=no_fly_zone&status=active&limit=20&offset=0`
- **Phản hồi thành công**: `200 OK` - Model: `AirspaceZoneListVm`:
  ```json
  {
    "items": [
      {
        "id": "z1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "hubId": null,
        "name": "Khu vực Cấm bay Dinh Độc Lập",
        "zoneType": "no_fly_zone",
        "altitudeCeiling": 120.0,
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [106.69, 10.77],
              [106.70, 10.77],
              [106.70, 10.78],
              [106.69, 10.78],
              [106.69, 10.77]
            ]
          ]
        },
        "status": "active",
        "description": "Vùng bảo vệ an ninh trọng yếu",
        "createdOn": "2026-10-10T08:00:00Z",
        "createdBy": "admin",
        "lastModifiedOn": "2026-10-10T08:30:00Z",
        "lastModifiedBy": "admin"
      }
    ],
    "total": 1
  }
  ```

---

### 4.4.4 `GET /api/v1/airspace/zones/{id}`
Lấy chi tiết cấu hình và đa giác không gian của một vùng không phận theo UUID.

- **Chỉ định role**: Authenticated
- **Input (Path Params)**: `id` (UUID)
- **Phản hồi thành công**: `200 OK` - Model: `AirspaceZoneVm`:
  ```json
  {
    "id": "z1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "hubId": null,
    "name": "Khu vực Cấm bay Dinh Độc Lập",
    "zoneType": "no_fly_zone",
    "altitudeCeiling": 120.0,
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [106.69, 10.77],
          [106.70, 10.77],
          [106.70, 10.78],
          [106.69, 10.78],
          [106.69, 10.77]
        ]
      ]
    },
    "status": "active",
    "description": "Vùng bảo vệ an ninh trọng yếu",
    "createdOn": "2026-10-10T08:00:00Z",
    "createdBy": "admin",
    "lastModifiedOn": "2026-10-10T08:30:00Z",
    "lastModifiedBy": "admin"
  }
  ```
- **Phản hồi lỗi**: `404 Not Found`.

---

### 4.4.5 `POST /api/v1/airspace/zones`
Tạo mới vùng không phận (Vùng cấm, vùng hạn chế, hành lang bay).

- **Chỉ định role**: `admin, atc`
- **Input (Request Body)** - Model: `AirspaceZonePostVm`:
  ```json
  {
    "name": "Khu vực Cấm bay Dinh Độc Lập",
    "hubId": null,
    "zoneType": "no_fly_zone",
    "altitudeCeiling": 120.0,
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [106.69, 10.77],
          [106.70, 10.77],
          [106.70, 10.78],
          [106.69, 10.78],
          [106.69, 10.77]
        ]
      ]
    },
    "status": "active",
    "description": "Vùng bảo vệ an ninh trọng yếu"
  }
  ```
- **Logic xử lý cốt lõi**:
  1. Validate tính hợp lệ của GeoJSON Polygon (kiểu `Polygon`, vòng khép kín tối thiểu 4 điểm, tọa độ đầu trùng tọa độ cuối).
  2. Kiểm tra tính duy nhất của tên vùng không phận `name`. Nếu trùng $\rightarrow$ Trả về `409 Conflict`.
  3. Nếu có truyền `hubId`: Kiểm tra sự tồn tại của Hub qua `hub-service`. Nếu không tìm thấy $\rightarrow$ Trả về `404 Not Found`.
  4. Khởi tạo bản ghi với `status = 'active'`.
- **Phản hồi thành công**: `201 Created` - Model: `AirspaceZoneVm`.
- **Phản hồi lỗi**: `400 Bad Request`, `404 Not Found`, `409 Conflict`.

---

### 4.4.6 `PUT /api/v1/airspace/zones/{id}`
Cập nhật thông số trần bay, đa giác tọa độ, thông tin mô tả hoặc trạng thái vùng không phận.

- **Chỉ định role**: `admin, atc`
- **Input (Path Params)**: `id` (UUID)
- **Input (Request Body)** - Model: `AirspaceZonePutVm`:
  ```json
  {
    "name": "Khu vực Cấm bay Dinh Độc Lập (Mở rộng)",
    "hubId": null,
    "zoneType": "no_fly_zone",
    "altitudeCeiling": 150.0,
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [106.68, 10.76],
          [106.71, 10.76],
          [106.71, 10.79],
          [106.68, 10.79],
          [106.68, 10.76]
        ]
      ]
    },
    "status": "active",
    "description": "Mở rộng bán kính bảo vệ an ninh"
  }
  ```
- **Logic xử lý cốt lõi**:
  1. Kiểm tra bản ghi tồn tại theo `id`. Nếu không thấy $\rightarrow$ Trả về `404 Not Found`.
  2. Nếu cập nhật `name`: Kiểm tra tên không trùng với các vùng khác. Nếu trùng $\rightarrow$ Trả về `409 Conflict`.
  3. Nếu cập nhật `hubId`: Kiểm tra tồn tại qua `hub-service`. Nếu không thấy $\rightarrow$ Trả về `404 Not Found`.
  4. Nếu cập nhật `geometry`: Validate tính hợp lệ của đa giác Polygon.
  5. Cập nhật và lưu bản ghi.
- **Phản hồi thành công**: `200 OK` - Model: `AirspaceZoneVm`.
- **Phản hồi lỗi**: `400 Bad Request`, `404 Not Found`, `409 Conflict`.

---

### 4.4.7 `DELETE /api/v1/airspace/zones/{id}`
Vô hiệu hóa (Soft-delete) vùng không phận bằng cách chuyển `status` sang `inactive`.

- **Chỉ định role**: `admin`
- **Input (Path Params)**: `id` (UUID)
- **Logic xử lý cốt lõi**:
  1. Kiểm tra bản ghi tồn tại theo `id`. Nếu không thấy $\rightarrow$ Trả về `404 Not Found`.
  2. Chuyển `status` thành `inactive` và lưu DB.
- **Phản hồi thành công**: `200 OK` (`{"message": "Airspace zone deactivated successfully"}`).
- **Phản hồi lỗi**: `404 Not Found`.
