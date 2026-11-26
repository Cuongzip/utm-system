# 15. MODULE WEATHER & AIS (Stateless Microservice: `weather-ais`)

> [← Quay lại Mục lục API](README.md) | [Quy chuẩn thiết kế chung](00-common-standards.md)

Cổng dữ liệu khí tượng hàng không, thông báo tin tức hàng không (AIS/NOTAM), giám sát tàu bay có người lái ADS-B, không phận mở OpenAIP và lớp bản đồ WMS/DAGR cho không phận Việt Nam (`VVTS`, `VVNB`, `VVDN`, `VVCR`, `VVPQ`, `VVCI`, `VVPB`, `VVCT`; FIR `VVHM`, `VVGL`). Dịch vụ hoạt động phi trạng thái DB (Stateless) với bộ đệm TTL tốc độ cao trong bộ nhớ.

---

## 15.1 Cấu Trúc Bộ Đệm & Nguồn Dữ Liệu

Dịch vụ không quản lý bảng PostgreSQL riêng mà tổng hợp dữ liệu trực tiếp kèm bộ đệm TTL chống quá tải:
- **Aviation Weather (METAR / TAF / SIGMET)**: AviationWeather.gov + Open-Meteo (TTL 5 phút, ánh xạ trạm ICAO gần nhất theo khoảng cách Haversine từ tọa độ `Hub`).
- **ADS-B Manned Traffic**: `adsb.lol` quanh các tâm FIR Việt Nam (TTL 3 giây).
- **NOTAM**: Autorouter / nguồn tin tức hàng không Việt Nam (TTL 5 phút, chuẩn hóa tọa độ tâm và bán kính ảnh hưởng sang mét).
- **OpenAIP & Raster Tiles**: OpenAIP Core API (`VN`) + Tile Proxy `/api/v1/openaip/tiles/{z}/{x}/{y}` (TTL 30 phút, public tile cache).
- **DAGR / WMS Geoserver**: Cấu hình lớp WMS không phận và truy vấn `GetFeatureInfo` theo tọa độ điểm hoặc chuỗi điểm.

---

## 15.2 Các Enum Định Nghĩa

```typescript
export type WeatherGoNoGoVerdict = "GO" | "CAUTION" | "NO_GO";
export type WeatherSeverity = "INFO" | "WARNING" | "CRITICAL";
```

---

## 15.3 Chi Tiết Từng Endpoint

### 15.3.1 Nhóm Khí Tượng Hàng Không (`/api/v1/weather`)

#### `GET /api/v1/weather/metar`
Lấy bản tin quan trắc khí tượng sân bay METAR mới nhất theo danh sách mã ICAO.

- **Chỉ định role**: Authenticated
- **Input (Query Params)**: `?icaos=VVTS,VVNB,VVDN` (nếu bỏ trống sẽ dùng danh sách sân bay Việt Nam mặc định).
- **Phản hồi thành công**: `200 OK` - Model: `MetarFeedVm`:
  ```json
  {
    "stations": ["VVTS", "VVNB"],
    "items": [
      {
        "icaoId": "VVTS",
        "observationTime": "2026-11-25T00:00:00Z",
        "rawOb": "VVTS 250000Z 11008KT 9999 FEW020 28/23 Q1011 NOSIG",
        "tempC": 28.0,
        "dewpointC": 23.0,
        "windDirDeg": 110,
        "windSpeedKt": 8.0,
        "windGustKt": null,
        "visibilityMeters": 10000.0,
        "flightCategory": "VFR"
      }
    ],
    "fetchedAt": "2026-11-25T00:05:00Z"
  }
  ```

#### `GET /api/v1/weather/taf`
Lấy bản tin dự báo sân bay TAF cho các trạm ICAO Việt Nam (`?icaos=VVTS,VVNB`).

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `TafFeedVm`.

#### `GET /api/v1/weather/sigmet`
Lấy cảnh báo thời tiết nguy hiểm trên đường bay SIGMET/AIRMET trong vùng thông báo bay (`?firs=VVHM,VVGL`).

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `SigmetFeedVm`.

#### `GET /api/v1/weather/current/{hubId}`
Lấy điều kiện thời tiết mặt đất & tầng thấp tức thời tại tọa độ của một `Hub` kết hợp trạm ICAO gần nhất.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `HubWeatherCurrentVm`:
  ```json
  {
    "hubId": "76a06ff8-4ca7-418f-8077-c6c656fba3f5",
    "nearestIcao": "VVTS",
    "temperatureC": 29.4,
    "humidityPct": 74.0,
    "windSpeedMs": 4.2,
    "windGustMs": 6.1,
    "windDirectionDeg": 135.0,
    "precipitationMm": 0.0,
    "visibilityMeters": 10000.0,
    "observedAt": "2026-11-25T00:10:00Z"
  }
  ```

#### `GET /api/v1/weather/forecast/{hubId}`
Dự báo khí tượng theo giờ tại `Hub` (`?hours=24`, mặc định 24 giờ).

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `HubWeatherForecastVm`.

#### `GET /api/v1/weather/alerts/{hubId}`
Tổng hợp các cảnh báo thời tiết vượt ngưỡng vận hành UAS tại `Hub` (gió giật, mưa lớn, tầm nhìn thấp, SIGMET gần trạm).

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `List<WeatherAlertVm>`.

#### `GET /api/v1/weather/go-no-go/{hubId}`
Đánh giá tự động điều kiện cất cánh khí tượng (`GO` / `CAUTION` / `NO_GO`) dựa trên ngưỡng gió, gió giật, lượng mưa và tầm nhìn.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `WeatherGoNoGoVm`:
  ```json
  {
    "hubId": "76a06ff8-4ca7-418f-8077-c6c656fba3f5",
    "nearestIcao": "VVTS",
    "verdict": "GO",
    "windSpeedMs": 4.2,
    "windGustMs": 6.1,
    "visibilityMeters": 10000.0,
    "precipitationMm": 0.0,
    "reasons": ["All meteorological parameters within nominal UAS operating envelope"],
    "evaluatedAt": "2026-11-25T00:10:00Z"
  }
  ```

---

### 15.3.2 Nhóm Giám Sát Tàu Bay ADS-B & NOTAM (`/api/v1/adsb`, `/api/v1/notam`)

#### `GET /api/v1/adsb/aircraft`
Truy vấn danh sách tàu bay có người lái đang phát đáp ADS-B trong vùng trời quản lý.

- **Chỉ định role**: Authenticated
- **Input (Query Params)**: `?lat=10.8188&lon=106.6519&radiusNm=120` (tùy chọn).
- **Phản hồi thành công**: `200 OK` - Model: `AdsbFeedVm`:
  ```json
  {
    "aircraft": [
      {
        "hex": "888123",
        "callsign": "HVN214",
        "latitude": 10.8412,
        "longitude": 106.6715,
        "altitudeMeters": 914.4,
        "groundSpeedMs": 78.2,
        "trackDeg": 248.0,
        "verticalRateMs": -3.5,
        "squawk": "4215"
      }
    ],
    "total": 1,
    "fetchedAt": "2026-11-25T00:10:02Z"
  }
  ```

#### `GET /api/v1/notam`
Lấy danh sách điện văn NOTAM đang còn hiệu lực theo mã FIR/ICAO (`?icaos=VVHM,VVTS`).

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `NotamFeedVm`.

---

### 15.3.3 Nhóm Không Phận OpenAIP & Bản Đồ WMS DAGR (`/api/v1/openaip`, `/api/v1/dagr`)

#### `GET /api/v1/openaip/airspaces`
Lấy danh sách đa giác không phận hàng không từ OpenAIP theo quốc gia (`?country=VN`) hoặc khung nhìn `bbox`. Được `airspace` service đồng bộ sang thuật toán kiểm tra giao cắt `/api/v1/airspace/check` và `/check-path`.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `OpenaipAirspaceFeedVm`.

#### `GET /api/v1/openaip/tiles/{z}/{x}/{y}`
Proxy tải mảnh bản đồ hàng không PNG (`image/png`) có cache header phục vụ hiển thị lớp phủ trên bản đồ CesiumJS.

- **Chỉ định role**: Public (`permitAll` để trình duyệt tải tile trực tiếp)
- **Phản hồi thành công**: `200 OK` (`image/png`).

#### `GET /api/v1/dagr/config`
Trả về cấu hình kết nối WMS/DAGR hiện hành (`wmsUrl`, `layer`, `enabled`).

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `DagrConfigVm`.

#### `GET /api/v1/dagr/feature-info` & `POST /api/v1/dagr/check-points`
Truy vấn thông tin vùng hạn chế bay từ máy chủ WMS tại một tọa độ (`?lat=10.77&lon=106.70`) hoặc danh sách nhiều điểm mốc trên lộ trình.

- **Chỉ định role**: Authenticated
- **Phản hồi thành công**: `200 OK` - Model: `DagrCheckResultVm`.
