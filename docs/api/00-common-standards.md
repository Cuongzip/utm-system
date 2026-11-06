# 00. QUY CHUẨN THIẾT KẾ DỮ LIỆU & API DÙNG CHUNG

> [← Quay lại Mục lục API](README.md)

Tài liệu này định nghĩa các mô hình dữ liệu dùng chung (Base Audit Entity, Pagination, Error Envelope, Naming Conventions) áp dụng xuyên suốt tất cả các module trong hệ thống DROPS-UTM.

---

## 1. THỰC THỂ KIỂM TOÁN CƠ SỞ (`AbstractAuditEntity`)

Mọi bảng dữ liệu nghiệp vụ đều kế thừa từ lớp kiểm toán `AbstractAuditEntity` (thuộc `common-library`):

| Tên Cột DB (PostgreSQL) | Kiểu DB | Thuộc Tính DTO (JSON) | Ràng Buộc | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `varchar(36)` | `id: string` | **PK**, NOT NULL | Định danh UUID v4 duy nhất của bản ghi |
| `created_on` | `timestamptz` | `createdOn: string` | NOT NULL, Auto | Thời điểm tạo bản ghi (Tự động gán thời gian thực) |
| `created_by` | `varchar(100)` | `createdBy: string` | NULLABLE | Username / ID người tạo (Lấy tự động từ JWT Token) |
| `last_modified_on` | `timestamptz` | `lastModifiedOn: string` | NOT NULL, Auto | Thời điểm cập nhật cuối (Tự động cập nhật) |
| `last_modified_by` | `varchar(100)` | `lastModifiedBy: string` | NULLABLE | Username / ID người cập nhật cuối cùng |

> **Nguyên tắc tài liệu**: Các bảng nghiệp vụ tại từng module chỉ liệt kê các cột nghiệp vụ đặc thù, không lặp lại 5 trường audit trên. Các Response DTO khi trả ra ngoài client đều tự động kèm đầy đủ 5 trường này.

---

## 2. QUY CHUẨN PHÂN TRANG & BỘ LỌC (`*ListVm`)

Mọi API danh sách (`GET /api/v1/{resources}`) đều áp dụng cơ chế phân trang `limit` & `offset`:

- **Query Parameters**:
  - `limit` *(integer, default: 20)*: Số bản ghi tối đa trả về trên một trang.
  - `offset` *(integer, default: 0)*: Vị trí bắt đầu lấy bản ghi.
  - `search` *(string, optional)*: Từ khóa tìm kiếm tự do.
  - Các tham số lọc nghiệp vụ bổ sung (ví dụ: `status`, `type`, `hubId`...).

- **Cấu trúc phản hồi chuẩn**:
  ```json
  {
    "items": [
      { /* Dữ liệu chi tiết đối tượng */ }
    ],
    "total": 42
  }
  ```

---

## 3. QUY CHUẨN ĐỐI TƯỢNG BÁO LỖI (`ErrorVm`)

Khi xảy ra lỗi (Validation `400`, Không tìm thấy `404`, Xung đột dữ liệu `409`, Vi phạm an toàn bay), backend luôn trả về cấu trúc lỗi thống nhất:

```json
{
  "statusCode": "400",
  "title": "Validation Failed",
  "detail": "Request payload contains invalid fields",
  "fieldErrors": [
    "name: Organization name is required"
  ]
}
```

---

## 4. QUY ƯỚC ĐẶT TÊN & HTTP METHODS

| Thành phần | Quy ước | Ví dụ |
| :--- | :--- | :--- |
| **Đường dẫn API (Endpoints)** | Tiền tố `/api/v1/`, danh từ số nhiều, `kebab-case` | `/api/v1/airspace-zones`, `/api/v1/organizations` |
| **Bảng & Cột Database** | `snake_case` | `registration_number`, `created_on` |
| **JSON Request & Response** | `camelCase` | `registrationNumber`, `createdOn` |
| **Enums trong JSON** | `lowercase` hoặc `snake_case` | `"operator"`, `"in_flight"`, `"active"` |

### Ý nghĩa HTTP Status Codes:
- `200 OK`: Truy vấn hoặc cập nhật thành công.
- `201 Created`: Tạo mới thành công (trả về đối tượng vừa tạo kèm `id`).
- `204 No Content`: Xóa / Vô hiệu hóa thành công (thân phản hồi rỗng).
- `400 Bad Request`: Payload sai hoặc vi phạm ràng buộc an toàn miền không lưu.
- `401 Unauthorized` / `403 Forbidden`: Chưa xác thực hoặc không đủ quyền RBAC.
- `404 Not Found`: Không tìm thấy bản ghi theo UUID.
- `409 Conflict`: Trùng lặp trường duy nhất (Unique constraint).
