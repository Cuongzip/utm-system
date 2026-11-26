# 17. MODULE INTELLIGENCE & AI COPILOT (Stateless Microservice: `intelligence`)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Trung tâm phân tích thông minh & Trợ lý điều hành không lưu của hệ sinh thái DROPS-UTM, gồm 3 phân hệ: **Pre-Flight Briefing** (hồ sơ thẩm định tổng hợp đa nguồn trước chuyến bay), **Airspace Foresight** (dự báo sớm xung đột 4D trong cửa sổ 2-5 phút và giả lập phương án giải tỏa), và **Operator Copilot** (trợ lý hội thoại sử dụng công cụ truy vấn thời gian thực kèm cơ chế xác nhận bắt buộc cho mọi thao tác điều khiển). Hỗ trợ suy luận LLM qua `UTM_AI_API_KEY` và **tự động chuyển về bộ suy luận tất định (100% Deterministic Fallback)** khi không cấu hình khóa AI.

---

## 17.1 Các Enum Định Nghĩa

```typescript
export type BriefingRiskLevel = "GREEN" | "AMBER" | "RED";
export type BriefingRecommendation = "GO" | "GO_WITH_CONDITIONS" | "NO_GO";
export type ForesightThreatType = "DRONE_VS_DRONE" | "DRONE_VS_AIRCRAFT" | "AIRSPACE_INTRUSION" | "WEATHER_CONVERGENCE";
```

---

## 17.2 Chi Tiết Từng Endpoint

### 17.2.1 Phân Hệ Pre-Flight Briefing (`/api/v1/briefing`)

#### `GET /api/v1/briefing/flight/{flightId}`
Thu thập song song dữ liệu từ 7 dịch vụ (`flight`, `drone`, `hub`, `weather-ais` [METAR/TAF, NOTAM, ADS-B], `airspace`, `conflict`, `emergency`) để tổng hợp bản tin Briefing trước chuyến bay và chấm mức rủi ro tổng thể (`GREEN` / `AMBER` / `RED`).

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `FlightBriefingVm`:
  ```json
  {
    "flightId": "2babe10b-d5b1-42a0-9c7b-f65f7473b566",
    "flightNumber": "FL-2026-001",
    "overallRisk": "GREEN",
    "weatherSummary": {
      "verdict": "GO",
      "windSpeedMs": 4.2,
      "visibilityMeters": 10000.0
    },
    "airspaceSummary": {
      "safe": true,
      "violationCount": 0
    },
    "trafficSummary": {
      "nearbyMannedAircraft": 0,
      "activeConflicts": 0,
      "relevantNotams": 1
    },
    "generatedAt": "2026-11-25T00:15:00Z"
  }
  ```

#### `GET /api/v1/briefing/flight/{flightId}/assess`
Đưa ra khuyến nghị điều hành chi tiết (`GO` / `GO_WITH_CONDITIONS` / `NO_GO`), danh sách nguyên nhân chặn bay (`blockingReasons`) và các biện pháp giảm thiểu rủi ro (`mitigations`) từ mô hình AI hoặc bộ quy tắc tất định.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `BriefingAssessmentVm`:
  ```json
  {
    "flightId": "2babe10b-d5b1-42a0-9c7b-f65f7473b566",
    "overallRisk": "GREEN",
    "ai": {
      "recommendation": "GO",
      "summary": "Flight FL-2026-001 satisfies energy reserve, corridor clearance, andVVTS meteorological minimums.",
      "blockingReasons": [],
      "mitigations": ["Monitor Saigon River corridor traffic during approach to Thu Thiem"],
      "source": "deterministic"
    }
  }
  ```

---

### 17.2.2 Phân Hệ Airspace Foresight (`/api/v1/foresight`)

#### `GET /api/v1/foresight/predict`
Nội suy quỹ đạo 4D trong cửa sổ tương lai (`?horizonSec=180`, mặc định 180 giây) cho toàn bộ Drone đang bay, tàu bay có người lái ADS-B và vùng cấm bay để cảnh báo sớm nguy cơ mất phân cách trước khi xung đột xảy ra.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `ForesightPredictionResponseVm`:
  ```json
  {
    "horizonSec": 180,
    "threats": [
      {
        "threatId": "THR-SAIGON-001",
        "threatType": "DRONE_VS_DRONE",
        "severity": "HIGH",
        "primaryEntityId": "FL-2026-001",
        "secondaryEntityId": "FL-2026-002",
        "timeToClosestApproachSec": 68,
        "projectedHorizontalMissM": 82.5,
        "projectedVerticalMissM": 15.0,
        "conflictPoint": { "latitude": 10.7815, "longitude": 106.7240, "altitudeM": 115.0 }
      }
    ],
    "evaluatedAt": "2026-11-25T00:15:10Z"
  }
  ```

#### `POST /api/v1/foresight/advise`
Sinh khuyến nghị chiến thuật giải tỏa cho một mối đe dọa dự báo (ví dụ: tăng/giảm độ cao 20m, giảm tốc hoặc bay treo nhường đường).

- **Chỉ định role**: `admin, atc, hub_operator, pilot`
- **Input (Request Body)** - Model: `ForesightAdvisePostVm`:
  ```json
  {
    "threatId": "THR-SAIGON-001"
  }
  ```
- **Phản hồi thành công**: `200 OK` - Model: `ForesightAdvisoryVm`.

#### `POST /api/v1/foresight/simulate-resolution`
Kiểm chứng hình học 4D xem hành động giải tỏa dự kiến (`SET_ALTITUDE`, `HOVER`, `SPEED_ADJUSTMENT`) có triệt tiêu hoàn toàn vi phạm phân cách và không tạo ra xung đột thứ cấp mới hay không.

- **Chỉ định role**: `admin, atc, hub_operator, pilot`
- **Input (Request Body)** - Model: `SimulateResolutionPostVm`:
  ```json
  {
    "threatId": "THR-SAIGON-001",
    "targetFlightId": "2babe10b-d5b1-42a0-9c7b-f65f7473b566",
    "maneuverType": "SET_ALTITUDE",
    "targetAltitudeM": 140.0
  }
  ```
- **Phản hồi thành công**: `200 OK` - Model: `ResolutionSimulationResultVm` (`resolved: true`, `newMinHorizontalMissM`, `newMinVerticalMissM`, `secondaryConflicts: 0`).

#### `POST /api/v1/foresight/demo/start` & `POST /api/v1/foresight/demo/reset`
Kích hoạt hoặc đặt lại kịch bản mô phỏng hội tụ đa phương tiện trên hành lang sông Sài Gòn (TP.HCM) phục vụ diễn tập điều hành viên ATC.

- **Chỉ định role**: `admin, atc, hub_operator`
- **Phản hồi thành công**: `200 OK`.

---

### 17.2.3 Phân Hệ Operator Copilot (`/api/v1/copilot`)

#### `POST /api/v1/copilot/chat`
Trợ lý điều hành tương tác bằng ngôn ngữ tự nhiên. Hỗ trợ 11 công cụ đọc dữ liệu trực tiếp (`list_active_flights`, `get_flight_details`, `list_drones`, `get_hub_weather`, `list_active_conflicts`, `list_active_emergencies`, `predict_foresight_threats`, `get_fleet_overview`, `list_notams`, `list_adsb_aircraft`, `check_flight_briefing`) và 4 công cụ đề xuất hành động có chốt xác nhận an toàn (`propose_drone_command`, `propose_flight_abort`, `propose_conflict_resolution`, `propose_fleet_rebalance` — chỉ trả về thẻ `proposedActions` để người vận hành bấm xác nhận, tuyệt đối không tự ý phát lệnh bay ngầm).

- **Chỉ định role**: Authenticated
- **Input (Request Body)** - Model: `CopilotChatPostVm`:
  ```json
  {
    "message": "Kiểm tra tình hình các chuyến bay đang hoạt động và xung đột hiện tại",
    "history": []
  }
  ```
- **Phản hồi thành công**: `200 OK` - Model: `CopilotChatResponseVm`:
  ```json
  {
    "reply": "Hiện có 3 chuyến bay đang hoạt động, 1 cảnh báo phân cách cần theo dõi và điều kiện khí tượng tại khu vực TP.HCM đạt ngưỡng an toàn.",
    "toolsUsed": ["list_active_flights", "list_active_conflicts"],
    "proposedActions": [],
    "source": "deterministic",
    "respondedAt": "2026-11-25T00:16:00Z"
  }
  ```
