# 01. MODULE IDENTITY & AUTH (Thực thể: `User`)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Quản lý đăng ký, đăng nhập tài khoản, cấp phát JWT Token (Keycloak OAuth2 / Resource Server), phân quyền RBAC và cấp chứng chỉ phi công bay.

---

## 1.1 Cấu Trúc Bảng Dữ Liệu (`users`)

> **Kế thừa kiểm toán**: Kế thừa toàn bộ từ `AbstractAuditEntity` (`id`, `created_on`, `created_by`, `last_modified_on`, `last_modified_by`).

### Các Cột Nghiệp Vụ Riêng Biệt (Domain Columns)

| Tên Cột DB (PostgreSQL) | Kiểu Dữ Liệu DB | Kiểu DTO | Khóa / Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `email` | `varchar(255)` | `string` | NOT NULL, **UNIQUE** | Email đăng nhập hệ thống |
| `password_hash` | `varchar(255)` | *(Internal)* | NOT NULL | Mật khẩu băm an toàn (BCrypt/Argon2) |
| `first_name` | `varchar(100)` | `string` | NULLABLE | Tên |
| `last_name` | `varchar(100)` | `string` | NULLABLE | Họ và tên đệm |
| `role` | `varchar(50)` | `UserRole` | NOT NULL, Default: `'operator'` | Vai trò trong hệ thống (RBAC) |
| `organization_id` | `varchar(36)` | `string` | **FK** -> `organization.id` | Tổ chức chủ quản |
| `pilot_license` | `varchar(100)` | `string` | NULLABLE | Số hiệu bằng lái phi công drone (bắt buộc nếu role = pilot) |
| `status` | `varchar(50)` | `UserStatus` | NOT NULL, Default: `'active'` | Trạng thái tài khoản |

---

## 1.2 Các Enum Định Nghĩa

```typescript
export type UserRole = "admin" | "hub_operator" | "pilot" | "atc";
// 'admin': Quản trị viên tối cao hệ thống
// 'hub_operator': Người điều hành tại Vertiport / Bãi đáp
// 'pilot': Phi công phụ trách bay / giám sát hành trình
// 'atc': Kiểm soát viên không lưu (Cấp phép bay, xử lý xung đột)

export type UserStatus = "active" | "inactive" | "suspended";
```

---

## 1.3 Mối Quan Hệ Liên Kết (Relationships)

- **`Organization` (N - 1)**: `users.organization_id -> organization.id`
- **`Flight` (1 - N)**: Phi công phụ trách chuyến bay `flight.pilot_id -> users.id`
- **`Mission` (1 - N)**: Người lập kế hoạch nhiệm vụ `mission.created_by -> users.id`

---

## 1.4 Chi Tiết Từng Endpoint

### 1.4.1 `POST /api/v1/auth/register`
Đăng ký tài khoản người dùng mới vào hệ thống.

- **Chỉ định role**: Công khai (`@Public()`)
- **Input (Request Body)** - Model: `UserRegisterPostVm`:
  ```json
  {
    "email": "pilot.nam@droneexpress.vn",
    "password": "SecurePassword123@",
    "firstName": "Nam",
    "lastName": "Nguyen",
    "role": "pilot",
    "organizationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "pilotLicense": "PL-VN-2026-88"
  }
  ```
- **Logic xử lý cốt lõi**:
  1. **Validation**: Kiểm tra email hợp lệ, mật khẩu tối thiểu 8 ký tự. Nếu `role == 'pilot'`, bắt buộc phải có `pilotLicense`.
  2. **Check Unique**: Email chưa tồn tại trong hệ thống. Nếu đã có $\rightarrow$ Trả về `409 Conflict`.
  3. **Check Organization**: Tổ chức tồn tại và có `status = 'active'`.
  4. Băm mật khẩu, lưu tài khoản và kích hoạt `status = 'active'`.
- **Phản hồi thành công**: `201 Created` - Model: `UserVm`:
  ```json
  {
    "id": "u1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "pilot.nam@droneexpress.vn",
    "firstName": "Nam",
    "lastName": "Nguyen",
    "role": "pilot",
    "organizationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "pilotLicense": "PL-VN-2026-88",
    "status": "active",
    "createdOn": "2026-10-10T08:00:00Z"
  }
  ```
- **Phản hồi lỗi**:
  - `400 Bad Request`: Thiếu thông tin hoặc sai định dạng.
  - `409 Conflict`: Email đã tồn tại.

---

### 1.4.2 `POST /api/v1/auth/login`
Đăng nhập hệ thống và lấy JWT Bearer Token.

- **Chỉ định role**: Công khai (`@Public()`)
- **Input (Request Body)**:
  ```json
  {
    "email": "pilot.nam@droneexpress.vn",
    "password": "SecurePassword123@"
  }
  ```
- **Phản hồi thành công**: `200 OK`:
  ```json
  {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": {
      "id": "u1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "pilot.nam@droneexpress.vn",
      "role": "pilot",
      "organizationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
  }
  ```
- **Phản hồi lỗi**:
  - `401 Unauthorized`: Sai email hoặc mật khẩu, hoặc tài khoản đang bị khóa (`suspended`/`inactive`).

---

### 1.4.3 `GET /api/v1/auth/me`
Lấy hồ sơ cá nhân của tài khoản đang đăng nhập.

- **Chỉ định role**: Authenticated (Header `Authorization: Bearer <token>`)
- **Phản hồi thành công**: `200 OK` - Model: `UserVm` kèm thông tin tổ chức.

---

### 1.4.4 `GET /api/v1/users`
Lấy danh sách người dùng có phân trang.

- **Chỉ định role**: `admin, hub_operator`
- **Input (Query Params)**: `?role=pilot&organizationId=...&search=Nam&limit=20&offset=0`
  - Nếu người gọi là `hub_operator`: Hệ thống tự động gán bộ lọc theo `organizationId` của người gọi (Multi-tenancy isolation).
- **Phản hồi thành công**: `200 OK` - Model: `UserListVm`:
  ```json
  {
    "items": [
      {
        "id": "u1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "email": "pilot.nam@droneexpress.vn",
        "firstName": "Nam",
        "lastName": "Nguyen",
        "role": "pilot",
        "organizationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "pilotLicense": "PL-VN-2026-88",
        "status": "active",
        "createdOn": "2026-10-10T08:00:00Z"
      }
    ],
    "total": 1
  }
  ```

---

### 1.4.5 `GET /api/v1/users/{id}`
Lấy chi tiết một người dùng theo UUID.

- **Chỉ định role**: Authenticated (Chính chủ hoặc cùng tổ chức nếu là `hub_operator`, hoặc `admin`).
- **Phản hồi thành công**: `200 OK` - Model: `UserVm`.
- **Phản hồi lỗi**: `404 Not Found` (không tìm thấy), `403 Forbidden` (khác tổ chức).

---

### 1.4.6 `PUT /api/v1/users/{id}`
Cập nhật thông tin người dùng.

- **Chỉ định role**: Chính chủ hoặc `admin`.
- **Input (Request Body)**:
  ```json
  {
    "firstName": "Nam",
    "lastName": "Nguyen Van",
    "pilotLicense": "PL-VN-2026-99"
  }
  ```
- **Quy tắc an toàn**: Người dùng thông thường không được phép tự đổi `role` hoặc `organizationId`.
- **Phản hồi thành công**: `200 OK` - Model: `UserVm`.

---

### 1.4.7 `DELETE /api/v1/users/{id}`
Vô hiệu hóa (Soft-delete) tài khoản người dùng.

- **Chỉ định role**: `admin`
- **Ràng buộc an toàn bay**: Không cho phép vô hiệu hóa nếu phi công đang phụ trách một chuyến bay đang hoạt động (`flight.status = 'active'`).
- **Phản hồi thành công**: `204 No Content`.

