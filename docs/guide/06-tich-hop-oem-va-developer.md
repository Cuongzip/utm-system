# 06. Tích Hợp Thiết Bị OEM & Developer Portal

> [← An toàn Không phận & Khẩn cấp](05-an-toan-khong-phan-va-ung-pho-khan-cap.md) | [Mục lục Hướng dẫn](README.md)

Hướng dẫn dành cho **Quản trị viên (`Admin`)** và kỹ sư tích hợp kết nối trạm điều khiển mặt đất (GCS), thiết bị viễn trắc hãng thứ ba (OEM) vào hệ thống UTM.

---

## 1. Quản lý Khóa Tích hợp (`API Keys`)

**Đường dẫn**: `Platform` → **Developer** → Tab **API Keys** (`/dashboard/developer`)

Dùng để cấp quyền gửi dữ liệu viễn trắc hoặc đồng bộ trạng thái đội tàu từ hệ thống đối tác qua header `X-API-Key`:

1. Nhấn tạo khóa mới, đặt tên định danh dễ nhận biết theo đối tác/thiết bị và chọn phạm vi quyền hạn cho phép.
2. **Sao chép và lưu trữ khóa bí mật ngay khi vừa khởi tạo** (vì lý do bảo mật, khóa đầy đủ chỉ hiển thị một lần duy nhất; tuyệt đối không dán khóa trực tiếp vào mã nguồn công khai).
3. Khi đối tác ngừng hợp tác hoặc nghi ngờ lộ khóa, nhấn **Revoke** trên dòng tương ứng để vô hiệu hóa tức thời.

---

## 2. Kiểm thử Kết nối Trực tiếp (`API Playground`)

**Đường dẫn**: `Platform` → **Developer** → Tab **API Playground**

Cho phép kiểm tra nhanh các bản tin tích hợp ngay trên trình duyệt trước khi nạp cấu hình vào thiết bị thực tế:

- Chọn điểm cuối API mẫu, điền tham số / nội dung bản tin JSON và gửi yêu cầu thử nghiệm.
- Quan sát mã trạng thái phản hồi (`200 OK`, `400 Bad Request`, `401 Unauthorized`) và dữ liệu trả về để đối chiếu định dạng chuẩn.

---

## 3. Chứng chỉ Bảo mật & Tài liệu Kỹ thuật (`Docs & Root CA`)

**Đường dẫn**: `Platform` → **Developer** → Tab **Docs & Root CA**

- **Tải chứng chỉ gốc (`Root CA`)**: Phục vụ cấu hình xác thực hai chiều (mTLS / X.509) cho các thiết bị bay và cổng kết nối tại phân hệ `Connectivity`.
- **Hướng dẫn tích hợp nhanh (`Quick Start`)**: Cung cấp cấu trúc header xác thực, chu kỳ gửi gói tin khuyến nghị và quy tắc xử lý lỗi chuẩn.
- **Tra cứu toàn bộ OpenAPI (`Swagger UI`)**: Có thể mở trực tiếp từ trang **Settings** hoặc truy cập cổng `/swagger-ui/` trên Gateway để xem chi tiết cấu trúc dữ liệu của cả 15 phân hệ dịch vụ (hoặc xem bản đặc tả Markdown tại [`docs/api/README.md`](../api/README.md)).
