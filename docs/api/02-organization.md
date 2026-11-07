# 02. MODULE ORGANIZATIONS (Thực thể: `Organization`)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Quản lý doanh nghiệp hoặc cơ quan khai thác hệ thống trong mô hình Multi-tenancy (Đơn vị vận hành drone thương mại, Cơ quan quản lý nhà nước / Không lưu, Khách hàng doanh nghiệp).

---

## 2.1 Cấu Trúc Bảng Dữ Liệu (`organization`)

> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

### Các Cột Nghiệp Vụ Riêng Biệt (Domain Columns)

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `varchar(255)` | `string` | NOT NULL | Tên công ty / đơn vị vận hành |
| `type` | `varchar(50)` | `OrganizationType` | NOT NULL, Index | Phân loại tổ chức |
| `registration_number` | `varchar(100)` | `string` | NOT NULL, **UNIQUE** | Mã số đăng ký kinh doanh / Số hiệu giấy phép bay |
| `contact_info` | `text` | `string` | NULLABLE | Email, số điện thoại, địa chỉ liên hệ |
| `status` | `varchar(50)` | `OrganizationStatus` | NOT NULL, Index, Default: `'active'` | Trạng thái hoạt động của tổ chức |

---

## 2.2 Các Enum Định Nghĩa

```typescript
export type OrganizationType = "operator" | "authority" | "enterprise";
// 'operator': Doanh nghiệp vận hành bay / giao vận drone thương mại
// 'authority': Cơ quan quản lý nhà nước / Cục hàng không / Đơn vị kiểm soát không lưu
// 'enterprise': Khách hàng doanh nghiệp lớn thuê dịch vụ giao nhận không người lái

export type OrganizationStatus = "active" | "suspended" | "inactive";
// 'active': Hoạt động bình thường
// 'suspended': Bị tạm đình chỉ bay (do vi phạm an toàn không phận hoặc chờ thanh toán)
// 'inactive': Đã ngừng hoạt động / giải thể (Soft-deleted)
```

---

## 2.3 Mối Quan Hệ Liên Kết (Relationships)

- **`User` (1 - N)**: Một Organization quản lý nhiều nhân sự (phi công, điều hành bãi, quản trị viên): `organization.id <- user.organization_id`.
- **`Drone` (1 - N)**: Một Organization sở hữu nhiều phương tiện bay không người lái: `organization.id <- drone.owner_id`.

---

## 2.4 Chi Tiết Từng Endpoint

### 2.4.1 `POST /api/v1/organizations`
Đăng ký mới một tổ chức vào hệ thống UTM.

- **Chỉ định role**: `admin`
- **Input (Request Body)** - Model: `OrganizationPostVm`:
  ```json
  {
    "name": "Drone Express Global Corp",
    "type": "operator",
    "registrationNumber": "GP-2026-DK01",
    "contactInfo": "contact@droneexpress.vn | +84-28-3822-9999"
  }
  ```
- **Logic xử lý cốt lõi**:
  1. **Validation**: `name` và `type` bắt buộc không để trống.
  2. **Registration Number Generation & Unique Check**:
     - Nếu `registrationNumber` bỏ trống hoặc null: Tự động sinh mã duy nhất theo rule `ORGANIZATION_REGISTRATION` (`ORG-YYYY-XXXX`, ví dụ `ORG-2026-5SP4`).
     - Nếu người dùng nhập tay: Chuẩn hóa trim/uppercase và kiểm tra trùng lặp trong DB. Nếu đã tồn tại $\rightarrow$ Trả về `409 Conflict`.
  3. **Khởi tạo**: Gán `status = 'active'`, tự động sinh UUID `id`.
- **Phản hồi thành công**: `201 Created` - Model: `OrganizationVm`:
  ```json
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Drone Express Global Corp",
    "type": "operator",
    "registrationNumber": "GP-2026-DK01",
    "contactInfo": "contact@droneexpress.vn | +84-28-3822-9999",
    "status": "active",
    "createdOn": "2026-10-10T08:30:00Z"
  }
  ```
- **Phản hồi lỗi**: `400 Bad Request`, `409 Conflict`.

---

### 2.4.2 `GET /api/v1/organizations`
Lấy danh sách tổ chức có phân trang và bộ lọc.

- **Chỉ định role**: Authenticated
- **Input (Query Params)**: `?type=operator&status=active&search=Express&limit=20&offset=0`
- **Phản hồi thành công**: `200 OK` - Model: `OrganizationListVm`:
  ```json
  {
    "items": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "name": "Drone Express Global Corp",
        "type": "operator",
        "registrationNumber": "GP-2026-DK01",
        "contactInfo": "contact@droneexpress.vn",
        "status": "active",
        "createdOn": "2026-10-10T08:30:00Z"
      }
    ],
    "total": 1
  }
  ```

---

### 2.4.3 `GET /api/v1/organizations/{id}`
Lấy chi tiết thông tin của một tổ chức theo UUID.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `OrganizationVm`.
- **Phản hồi lỗi**: `404 Not Found`.

---

### 2.4.4 `PUT /api/v1/organizations/{id}`
Cập nhật thông tin tổ chức.

- **Chỉ định role**: `admin`
- **Input (Request Body)** - Model: `OrganizationPutVm`:
  ```json
  {
    "name": "Drone Express Global Logistics Corp",
    "contactInfo": "support@droneexpress.vn | +84-28-3822-8888",
    "status": "active"
  }
  ```
- **Ràng buộc nghiệp vụ**: Không cho phép thay đổi `registrationNumber` và `type` sau khi đã đăng ký thành công để bảo toàn lịch sử pháp lý.
- **Phản hồi thành công**: `200 OK` - Model: `OrganizationVm`.
- **Phản hồi lỗi**: `400 Bad Request`, `404 Not Found`.

---

### 2.4.5 `DELETE /api/v1/organizations/{id}`
Vô hiệu hóa (Soft-delete) tổ chức.

- **Chỉ định role**: `admin`
- **Chốt chặn an toàn bay (Domain Safety Guard)**:
  - Hệ thống gọi `FlightClientService` kiểm tra toàn bộ các drone thuộc tổ chức này có đang thực hiện chuyến bay hoạt động (`ACTIVE`, `SCHEDULED`) hay không.
  - Nếu còn chuyến bay đang hoạt động $\rightarrow$ Trả về `400 Bad Request` chặn thao tác hủy.
- **Xử lý**: Cập nhật `status = 'inactive'`.
- **Phản hồi thành công**: `204 No Content` / `200 OK`.

