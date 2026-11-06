# 14. QUY TRÌNH TÍCH HỢP LIÊN DỊCH VỤ TOÀN HỆ THỐNG (END-TO-END WORKFLOWS)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Sơ đồ tuần tự và luồng nghiệp vụ phối hợp liên dịch vụ (E2E Integration Orchestration) giữa Người điều hành bãi, Kiểm soát viên không lưu (ATC), Phi công và các microservices nghiệp vụ: Từ lập nhiệm vụ $\rightarrow$ Thẩm định năng lượng vật lý $\rightarrow$ Phê duyệt bay $\rightarrow$ Giám sát viễn trắc thời gian thực $\rightarrow$ Phát hiện xung đột 4D $\rightarrow$ Kích hoạt cảnh báo $\rightarrow$ Hệ thống tự động cứu nạn (Failsafe Brain).

---

## 14.1 Sơ Đồ Tuần Tự Toàn Trình (Master Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Người Điều Hành (hub_operator / admin)
    actor ATC as Không Lưu UTM (Role: atc)
    participant MissionSvc as Module Mission
    participant FlightSvc as Module Flight (Kế hoạch bay)
    participant FeasEngine as Flight - Feasibility (Energy Model)
    participant TelemetrySvc as Module Telemetry (STOMP WS)
    participant ConflictSvc as Module Conflict (CPA Watchdog)
    participant AlertSvc as Module Alert
    participant EmergencySvc as Module Emergency (Failsafe Brain)
    participant DroneCmdSvc as Drone - Command & Control
    participant DroneDev as Drone Phần Cứng (IoT) / Simulator

    %% Giai đoạn 1: Lập kế hoạch & Thẩm định an toàn trước cất cánh
    rect rgb(240, 248, 255)
        Note over Admin,ATC: GIAI ĐOẠN 1: SOẠN KẾ HOẠCH & THẨM ĐỊNH NĂNG LƯỢNG TRƯỚC BAY
        Admin->>MissionSvc: 1. POST /api/v1/missions (Tạo nhiệm vụ & chuỗi Waypoints)
        Admin->>MissionSvc: 2. POST /api/v1/missions/{id}/execute (Gán Drone A, Pilot B)
        MissionSvc->>FlightSvc: 3. Khởi tạo Flight (status: SCHEDULED, authorization: PENDING)
        Admin->>FeasEngine: 4. POST /api/v1/flights/{id}/feasibility/check (Tính Pin, Tải trọng, Gió METAR)
        FeasEngine-->>Admin: 5. Trả về kết quả: GO (Margin: 28.5%) & lưu feasibility_verdict
        ATC->>FlightSvc: 6. POST /api/v1/flights/{id}/authorize (Duyệt kế hoạch bay dựa trên phán quyết GO)
        Admin->>FlightSvc: 7. POST /api/v1/flights/{id}/start (Cất cánh -> Flight.status = ACTIVE, Drone.status = in_flight)
    end

    %% Giai đoạn 2: Phát dữ liệu viễn trắc & Giám sát thời gian thực
    rect rgb(245, 255, 245)
        Note over TelemetrySvc,ConflictSvc: GIAI ĐOẠN 2: VIỄN TRẮC THỜI GIAN THỰC & GIÁM SÁT XUNG ĐỘT 4D
        loop Tần số 1Hz: Luồng viễn trắc GPS
            DroneDev->>TelemetrySvc: 8. POST /api/v1/telemetry (GPS, pin, cao độ, speed)
            TelemetrySvc->>TelemetrySvc: Lưu DB & Cập nhật In-memory Cache
            TelemetrySvc-->>Admin: WebSocket phát tọa độ hiển thị lên Cesium 3D
        end

        loop Watchdog định kỳ 2-5s: Phát hiện xung đột & vi phạm hành lang
            FlightSvc->>TelemetrySvc: 9. Lấy telemetry tức thời mới nhất
            FlightSvc->>FlightSvc: Kiểm tra độ lệch hành lang (Cross-track deviation)
            ConflictSvc->>TelemetrySvc: 10. Quét khoảng cách không gian 4D giữa các máy bay
            opt Phát hiện nguy cơ va chạm (Separation < 30m, TCPA < 15s)
                ConflictSvc->>AlertSvc: 11. POST /api/v1/alerts (CONFLICT_PROXIMITY, CRITICAL)
                AlertSvc-->>Admin: STOMP Broadcast /topic/alerts/critical (Thẻ đỏ nhấp nháy trên Radar)
            end
        end
    end

    %% Giai đoạn 3: Ứng phó sự cố khẩn cấp & Tự động cứu nạn (Failsafe)
    rect rgb(255, 245, 245)
        Note over EmergencySvc,DroneCmdSvc: GIAI ĐOẠN 3: ỨNG PHÓ KHẨN CẤP & HẠ CÁNH AN TOÀN
        opt Phát sinh sự cố nguy cấp (Pin < 15% hoặc Mất kết nối C2)
            TelemetrySvc->>EmergencySvc: 12. POST /api/v1/emergency/incidents (BATTERY_CRITICAL)
            EmergencySvc->>EmergencySvc: Tra cứu kịch bản khẩn cấp (Protocol -> Action: RTL / LAND)
            EmergencySvc->>DroneCmdSvc: 13. POST /api/v1/drones/{id}/commands (Phát lệnh LAND khẩn cấp)
            DroneCmdSvc->>DroneDev: 14. Định tuyến lệnh qua WebSocket Gateway
            DroneDev-->>DroneCmdSvc: 15. Acknowledge & Drone tự động hạ cánh an toàn
            EmergencySvc->>FlightSvc: 16. Cập nhật Flight.status = EMERGENCY -> COMPLETED
        end
    end
```

---

## 14.2 Ma Trận Quyền Hạn & Trách Nhiệm (RACI Matrix)

| Giai đoạn nghiệp vụ | Role: `admin` | Role: `hub_operator` | Role: `pilot` | Role: `atc` |
| :--- | :---: | :---: | :---: | :---: |
| **Đăng ký tổ chức, Hub, Vùng cấm bay** | **A / R** | I | I | C |
| **Đăng ký Drone, Gán thiết bị IoT** | A | **R** | C | I |
| **Lập nhiệm vụ (Mission) & Tạo Flight** | A | **R** | **R** | I |
| **Thẩm định năng lượng trước bay (Feasibility)** | I | **R** | **R** | C |
| **Cấp phép bay (Flight Authorization)** | I | I | I | **A / R** |
| **Kích hoạt cất cánh (Start Flight)** | I | **R** | **R** | I |
| **Giải tỏa xung đột không gian (Deconfliction)** | I | I | C | **A / R** |
| **Phê chuẩn can thiệp cứu nạn khẩn cấp** | A | C | **R** | **A / R** |

*(Chú thích: **A**: Accountable - Chịu trách nhiệm tối cao; **R**: Responsible - Người trực tiếp thực thi; **C**: Consulted - Tham vấn ý kiến; **I**: Informed - Được nhận thông báo)*

