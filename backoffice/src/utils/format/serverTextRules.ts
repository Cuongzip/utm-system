export type PhraseReplacement = string | ((...args: string[]) => string);
export type PhraseRule = readonly [RegExp, PhraseReplacement];

export const VI_RESPONSE_ACTION_LABELS: Record<string, string> = {
    LAND: "Hạ cánh",
    RTH: "Về trạm (RTH)",
    RTL: "Về trạm (RTL)",
    HOVER: "Bay lơ lửng",
    HOLD: "Giữ vị trí",
    DIVERT: "Chuyển hướng",
    DESCEND: "Hạ độ cao",
    CLIMB: "Tăng độ cao",
    EMERGENCY_STOP: "Dừng khẩn cấp",
    ESTOP: "Dừng khẩn cấp",
    PAUSE: "Tạm dừng",
    RESUME: "Tiếp tục",
    TAKEOFF: "Cất cánh",
    GOTO: "Bay tới điểm",
    SET_ALTITUDE: "Đặt độ cao",
    CONFIGURE: "Cấu hình",
    SET_HOME: "Đặt trạm gốc",
    NONE: "Không",
};

export const EN_RESPONSE_ACTION_LABELS: Record<string, string> = {
    LAND: "LAND",
    RTH: "RTH",
    RTL: "RTL",
    HOVER: "HOVER",
    HOLD: "HOLD",
    DIVERT: "DIVERT",
    DESCEND: "DESCEND",
    CLIMB: "CLIMB",
    EMERGENCY_STOP: "ESTOP",
    ESTOP: "ESTOP",
    PAUSE: "PAUSE",
    RESUME: "RESUME",
    TAKEOFF: "TAKEOFF",
    GOTO: "GOTO",
    SET_ALTITUDE: "SET ALT",
    CONFIGURE: "CONFIG",
    SET_HOME: "SET HOME",
    NONE: "NONE",
};

export const TIMELINE_EVENT_LABELS: Record<string, { en: string; vi: string }> = {
    awaiting_confirmation: {
        en: "Awaiting Operator Confirmation",
        vi: "Chờ trực ban xác nhận",
    },
    action_executing: {
        en: "Executing Failsafe Action",
        vi: "Đang thực thi lệnh ứng phó",
    },
    command_dispatched: {
        en: "Failsafe Command Dispatched",
        vi: "Đã phát lệnh ứng phó tới UAV",
    },
    action_dispatch_failed: {
        en: "Failsafe Dispatch Failed",
        vi: "Gửi lệnh ứng phó thất bại",
    },
    action_completed: {
        en: "Failsafe Action Completed",
        vi: "Hoàn tất ứng phó sự cố",
    },
    incident_resolved: {
        en: "Incident Resolved",
        vi: "Đã đóng sự cố",
    },
    action_rejected: {
        en: "Failsafe Action Rejected",
        vi: "Đã từ chối lệnh ứng phó",
    },
    confirmation_timeout_auto_executed: {
        en: "Confirmation Timeout — Auto-Executed",
        vi: "Hết thời gian chờ — Tự động thực thi",
    },
    confirmation_timeout_escalated: {
        en: "Confirmation Timeout — Escalated",
        vi: "Hết thời gian chờ — Đã leo thang",
    },
    incident_detected: {
        en: "Incident Detected",
        vi: "Phát hiện sự cố",
    },
    detected: {
        en: "Incident Detected",
        vi: "Phát hiện sự cố",
    },
    acknowledged: {
        en: "Acknowledged",
        vi: "Đã ghi nhận",
    },
};

export const FLIGHT_LIFECYCLE_EVENT_LABELS: Record<string, { en: string; vi: string }> = {
    FLIGHT_DIVERTED: {
        en: "flight diverted",
        vi: "Chuyển hướng hạ cánh",
    },
    FLIGHT_COMPLETED: {
        en: "flight completed",
        vi: "Hoàn tất chuyến bay",
    },
    FLIGHT_EMERGENCY_LANDING: {
        en: "emergency landing",
        vi: "Hạ cánh khẩn cấp",
    },
    EMERGENCY_LANDING: {
        en: "emergency landing",
        vi: "Hạ cánh khẩn cấp",
    },
    FLIGHT_CANCELLED: {
        en: "flight cancelled",
        vi: "Hủy chuyến bay",
    },
    FLIGHT_ABORTED: {
        en: "flight aborted",
        vi: "Hủy khẩn chuyến bay",
    },
};

export const TIMELINE_DATA_KEY_LABELS: Record<string, { en: string; vi: string }> = {
    flightEvent: { en: "Event", vi: "Sự kiện" },
    flightId: { en: "Flight", vi: "Chuyến bay" },
    landingHubId: { en: "Hub", vi: "Trạm đáp" },
    hubId: { en: "Hub", vi: "Trạm Hub" },
    droneId: { en: "Aircraft", vi: "Tàu bay" },
    action: { en: "Action", vi: "Lệnh" },
    commandType: { en: "Command", vi: "Lệnh" },
    autoExecuted: { en: "Auto", vi: "Tự động" },
    touchdownAlt: { en: "Touchdown Alt", vi: "Cao độ đáp" },
    resolvedBy: { en: "Resolved by", vi: "Người đóng" },
    confirmedBy: { en: "Confirmed by", vi: "Người xác nhận" },
    rejectedBy: { en: "Rejected by", vi: "Người từ chối" },
    operator: { en: "Operator", vi: "Trực ban" },
    notes: { en: "Notes", vi: "Ghi chú" },
    timeoutSeconds: { en: "Timeout", vi: "Thời gian chờ" },
};

export const ONBOARD_DIAGNOSTIC_LABELS: Record<string, { en: string; vi: string }> = {
    MOTOR_FAILURE: { en: "Motor / Propulsion Failure", vi: "Lỗi động cơ / Hệ thống đẩy" },
    MOTOR_ANOMALY: { en: "Motor Vibration Anomaly", vi: "Rung động động cơ bất thường" },
    GPS_LOST: { en: "GNSS Fix Lost", vi: "Mất định vị vệ tinh GNSS" },
    GPS_DEGRADED: { en: "GNSS Precision Degraded", vi: "Suy giảm độ chính xác GNSS" },
    SIGNAL_LOST: { en: "C2 Link Lost", vi: "Mất kết nối điều khiển C2" },
    C2_LOST: { en: "C2 Link Lost", vi: "Mất kết nối điều khiển C2" },
    SIGNAL_WEAK: { en: "Weak C2 Signal", vi: "Tín hiệu C2 suy yếu" },
    BATTERY_CRITICAL: { en: "Critical Battery Level", vi: "Mức pin nguy cấp" },
    BATTERY_LOW: { en: "Low Battery Warning", vi: "Cảnh báo pin yếu" },
    BATTERY_RAPID_DISCHARGE: { en: "Rapid Battery Discharge", vi: "Tụt áp pin nhanh bất thường" },
    RAPID_BATTERY_DISCHARGE: { en: "Rapid Battery Discharge", vi: "Tụt áp pin nhanh bất thường" },
    GEOFENCE_BREACH: { en: "Geofence / Corridor Breach", vi: "Vi phạm hành lang / Geofence" },
    LATERAL_CORRIDOR_BREACH: { en: "Lateral Corridor Breach", vi: "Lệch ngang hành lang bay" },
    GEOFENCE_WARNING: { en: "Approaching Geofence Boundary", vi: "Tiếp cận ranh giới Geofence" },
    CROSSWIND_DRIFT: { en: "Crosswind Drift", vi: "Trôi dạt do gió ngang" },
    EMERGENCY_LAND_ACTIVE: { en: "Emergency Landing Active", vi: "Đang hạ cánh khẩn cấp" },
    HIGH_WIND: { en: "Sustained High Wind", vi: "Gió lớn vượt ngưỡng" },
    LOW_VISIBILITY: { en: "Low Visibility", vi: "Tầm nhìn hạn chế" },
};

export const VI_ALERT_TYPE_TITLES: Record<string, string> = {
    MOTOR_FAILURE: "LỖI ĐỘNG CƠ",
    MOTOR_ANOMALY: "BẤT THƯỜNG ĐỘNG CƠ",
    C2_LINK_LOST: "MẤT KẾT NỐI C2",
    C2_LINK_LOST_CONTINGENT: "GIÁN ĐOẠN KẾT NỐI C2",
    SIGNAL_LOST: "MẤT TÍN HIỆU C2",
    SIGNAL_LOSS: "SUY YẾU TÍN HIỆU C2",
    SIGNAL_WEAK: "TÍN HIỆU C2 YẾU",
    COMMUNICATION_LOSS: "MẤT LIÊN LẠC",
    GPS_FAILURE: "LỖI ĐỊNH VỊ GPS",
    GPS_LOST: "MẤT TÍN HIỆU GPS",
    GPS_DEGRADED: "SUY GIẢM ĐỊNH VỊ GPS",
    BATTERY_LOW: "CẢNH BÁO PIN YẾU",
    LOW_BATTERY: "CẢNH BÁO PIN YẾU",
    BATTERY_CRITICAL: "PIN NGUY CẤP",
    BATTERY_DRAIN: "SỤT PIN NHANH",
    BATTERY_RAPID_DISCHARGE: "TỤT ÁP PIN NHANH",
    GEOFENCE_BREACH: "VI PHẠM GEOFENCE",
    GEOFENCE_WARNING: "CẬN BIÊN GEOFENCE",
    GEOFENCE_VIOLATION: "VI PHẠM GEOFENCE",
    PROHIBITED_ZONE_ENTRY: "XÂM NHẬP VÙNG CẤM BAY",
    RESTRICTED_ZONE_ENTRY: "XÂM NHẬP VÙNG HẠN CHẾ",
    AIRSPACE_VIOLATION: "VI PHẠM KHÔNG PHẬN",
    AIRSPACE_BREACH: "XÂM NHẬP KHÔNG PHẬN",
    LATERAL_CORRIDOR_BREACH: "LỆCH NGANG HÀNH LANG",
    VERTICAL_CORRIDOR_BREACH: "LỆCH ĐỘ CAO HÀNH LANG",
    VERTICAL_ALTITUDE_BREACH: "LỆCH ĐỘ CAO HÀNH LANG",
    ALTITUDE_VIOLATION: "VI PHẠM ĐỘ CAO",
    "3D_VOLUME_BREACH": "VI PHẠM HÀNH LANG 4D",
    CORRIDOR_DEVIATION: "LỆCH HÀNH LANG BAY",
    LOSS_OF_SEPARATION: "MẤT PHÂN CÁCH",
    CONFLICT_PROXIMITY: "CẢNH BÁO PHÂN CÁCH",
    CONFLICT_DETECTED: "PHÁT HIỆN XUNG ĐỘT",
    COLLISION_WARNING: "NGUY CƠ VA CHẠM",
    COLLISION_AIRCRAFT: "NGUY CƠ VA CHẠM TÀU BAY",
    COLLISION_OBSTACLE: "NGUY CƠ VA CHƯỚNG NGẠI",
    EMERGENCY_INCIDENT: "SỰ CỐ KHẨN CẤP",
    WEATHER_HAZARD: "NGUY HIỂM THỜI TIẾT",
    WEATHER_WIND: "GIÓ LỚN VƯỢT NGƯỠNG",
    HIGH_WIND: "GIÓ LỚN VƯỢT NGƯỠNG",
    WEATHER_VISIBILITY: "TẦM NHÌN HẠN CHẾ",
    LOW_VISIBILITY: "TẦM NHÌN HẠN CHẾ",
    FLEET: "ĐỘI BAY",
};

export const SIMULATION_EVENT_TYPE_LABELS: Record<string, { en: string; vi: string }> = {
    SESSION_STARTED: { en: "SESSION STARTED", vi: "BẮT ĐẦU PHIÊN" },
    SESSION_PAUSED: { en: "SESSION PAUSED", vi: "TẠM DỪNG PHIÊN" },
    SESSION_RESUMED: { en: "SESSION RESUMED", vi: "TIẾP TỤC PHIÊN" },
    SESSION_STOPPED: { en: "SESSION STOPPED", vi: "DỪNG PHIÊN" },
    SESSION_COMPLETED: { en: "SESSION COMPLETED", vi: "HOÀN TẤT PHIÊN" },
    TIME_SCALE_CHANGED: { en: "TIME SCALE", vi: "TỐC ĐỘ TUA" },
    COMMAND_EXECUTED: { en: "C2 COMMAND", vi: "LỆNH C2" },
    SCENARIO_INJECTED: { en: "SCENARIO INJECTED", vi: "GÀI SỰ CỐ" },
    SCENARIO_ARMED: { en: "SCENARIO ARMED", vi: "CHỜ KÍCH HOẠT" },
    SCENARIO_TRIGGERED: { en: "SCENARIO TRIGGERED", vi: "KÍCH HOẠT SỰ CỐ" },
    SCENARIO_CLEARED: { en: "SCENARIO CLEARED", vi: "XÓA SỰ CỐ" },
    FAILSAFE_ACTIVATED: { en: "FAILSAFE", vi: "CỨU NẠN TỰ ĐỘNG" },
    EMERGENCY_LANDED: { en: "EMERGENCY LANDED", vi: "HẠ CÁNH KHẨN" },
};

export const SIMULATION_SCENARIO_LABELS: Record<string, { en: string; vi: string }> = {
    gps_failure: { en: "GPS FAILURE", vi: "LỖI GPS" },
    c2_lost: { en: "C2 LOST", vi: "MẤT SÓNG C2" },
    battery_drain: { en: "BATTERY DRAIN", vi: "SỤT PIN NHANH" },
    motor_failure: { en: "MOTOR FAILURE", vi: "HỎNG ĐỘNG CƠ" },
    geofence_breach: { en: "GEOFENCE BREACH", vi: "LỆCH HÀNH LANG" },
};

const SCENARIO_DISPLAY_NAME_VI: Record<string, string> = {
    "gps signal failure": "Mất / suy giảm tín hiệu GPS",
    "command & control link lost": "Mất kết nối điều khiển C2",
    "critical battery drain": "Sụt giảm pin nguy cấp",
    "rapid battery drain": "Sụt giảm pin nhanh",
    "motor / propulsion failure": "Hỏng động cơ / hệ thống đẩy",
    "geofence boundary breach": "Vi phạm ranh giới Geofence",
};

const SCENARIO_DESCRIPTION_VI: Record<string, string> = {
    "sudden loss or degradation of gps positioning signal, resulting in coordinate drift or complete signal loss.":
        "mất hoặc suy giảm đột ngột tín hiệu định vị GPS gây trôi tọa độ",
    "loss of telemetry and command link between ground control station and unmanned aircraft.":
        "mất liên kết viễn trắc và lệnh điều khiển giữa trạm mặt đất và tàu bay",
    "accelerated battery voltage drop simulating cell failure or extreme payload power draw.":
        "tụt điện áp pin nhanh mô phỏng hỏng cell pin hoặc quá tải công suất",
    "loss of thrust on one or more rotors causing rapid uncontrolled descent.":
        "mất lực đẩy trên cánh quay gây hạ độ cao mất kiểm soát",
    "lateral or vertical trajectory drift crossing restricted airspace or corridor boundaries.":
        "trôi quỹ đạo ngang hoặc đứng cắt qua ranh giới hành lang hoặc vùng hạn chế",
};

function actionVi(raw: string): string {
    const key = raw.trim().toUpperCase();
    return VI_RESPONSE_ACTION_LABELS[key] ?? raw;
}

function flightEventVi(raw: string): string {
    const key = raw.trim().toUpperCase();
    return FLIGHT_LIFECYCLE_EVENT_LABELS[key]?.vi ?? raw.replace(/_/g, " ");
}

function translateScenarioTitleVi(raw: string): string {
    const trimmed = raw.trim();
    return SCENARIO_DISPLAY_NAME_VI[trimmed.toLowerCase()] ?? trimmed;
}

function translateScenarioDetailVi(raw: string): string {
    const trimmed = raw.trim();
    const mapped = SCENARIO_DESCRIPTION_VI[trimmed.toLowerCase()];
    if (mapped) return mapped;
    return trimmed
        .replace(/driftDistanceMeters=/gi, "độ trôi=")
        .replace(/dischargeRatePerSecond=/gi, "tốc độ sụt=");
}

const CONFORMANCE_RULES: readonly PhraseRule[] = [
    [/^Severe 4D trajectory deviation:\s*/i, "Lệch quỹ đạo 4D nghiêm trọng: "],
    [
        /Cross-track deviation (\d+(?:\.\d+)?)m exceeds corridor radius (\d+(?:\.\d+)?)m/gi,
        "Độ lệch ngang hành trình $1m vượt bán kính hành lang $2m",
    ],
    [
        /Lateral deviation (\d+(?:\.\d+)?)m exceeds corridor (?:limit|radius) (\d+(?:\.\d+)?)m/gi,
        "Độ lệch ngang $1m vượt giới hạn hành lang $2m",
    ],
    [
        /Vertical deviation (\d+(?:\.\d+)?)m exceeds altitude (?:buffer|tolerance) (\d+(?:\.\d+)?)m/gi,
        "Độ lệch độ cao $1m vượt biên độ đệm độ cao $2m",
    ],
    [
        /Telemetry (?:stream absent|lost) for (\d+)\s*seconds?\s*\(exceeded (\d+)s emergency threshold\)/gi,
        "Mất tín hiệu viễn trắc trong $1 giây (vượt ngưỡng khẩn cấp $2 giây)",
    ],
    [
        /Telemetry (?:stream absent|lost) for (\d+)\s*seconds?\s*\(exceeded (\d+)s warning threshold\)/gi,
        "Mất tín hiệu viễn trắc trong $1 giây (vượt ngưỡng cảnh báo $2 giây)",
    ],
    [
        /Telemetry (?:stream absent|lost) for (\d+)\s*seconds?/gi,
        "Mất tín hiệu viễn trắc trong $1 giây",
    ],
    [
        /Rapid descent rate (-?\d+(?:\.\d+)?)\s*m\/s detected!\s*Suspected motor or propulsion failure/gi,
        "Phát hiện tốc độ hạ cao độ đột ngột $1 m/s! Nghi ngờ hỏng động cơ hoặc hệ thống đẩy",
    ],
    [
        /Critical battery depletion:\s*(\d+(?:\.\d+)?)%!\s*Immediate failsafe landing or RTH required/gi,
        "Pin cạn kiệt nguy cấp: $1%! Yêu cầu hạ cánh an toàn hoặc quay về trạm (RTH) ngay lập tức",
    ],
    [
        /Low battery level:\s*(\d+(?:\.\d+)?)%\.\s*Return to base recommended/gi,
        "Mức pin thấp: $1%. Khuyến nghị quay về trạm gốc",
    ],
    [
        /^Drone on planned 4D corridor trajectory$/i,
        "Drone đang bay đúng quỹ đạo hành lang 4D theo kế hoạch",
    ],
    [
        /^Flight returned to planned 4D corridor and C2 link nominal$/i,
        "Chuyến bay đã quay lại hành lang 4D kế hoạch và kết nối C2 ổn định",
    ],
    [
        /^(?:Aircraft|Flight) returned to 4D corridor conformance$/i,
        "Chuyến bay đã khôi phục tuân thủ hành lang 4D",
    ],
    [
        /Reached waypoint #(\d+)\s*\(awaiting operator confirmation\)/gi,
        "Đã tới điểm bay #$1 (chờ trực ban xác nhận)",
    ],
    [/Reached route waypoint #(\d+)/gi, "Đã tới điểm hành trình #$1"],
    [/Waypoint #(\d+) requires operator confirmation/gi, "Điểm bay #$1 yêu cầu trực ban xác nhận"],
];

const EMERGENCY_RULES: readonly PhraseRule[] = [
    [
        /^AUTO FAILSAFE:\s*([A-Z0-9_-]+)\s+executing for\s+[a-z0-9_]+\.\s*/i,
        (_m, action) => `Tự động cứu nạn (${actionVi(action)}) · `,
    ],
    [
        /CRITICAL EMERGENCY:\s*Action\s+([A-Z0-9_-]+)\s+awaits confirmation\.\s*Timeout in\s+(\d+)s/gi,
        (_m, action, sec) =>
            `KHẨN CẤP NGUY CẤP: Lệnh ${actionVi(action)} đang chờ xác nhận. Tự động xử lý sau ${sec} giây`,
    ],
    [
        /Rapid uncontrolled descent detected \(([^)]+)\):\s*suspected motor failure/gi,
        "Phát hiện hạ độ cao mất kiểm soát ($1): nghi ngờ hỏng động cơ",
    ],
    [
        /(Rapid|Elevated) battery discharge detected:\s*(\d+(?:\.\d+)?)%\/min\s*\(dropped\s*(\d+(?:\.\d+)?)%\s*in\s*(\d+)s,\s*current\s*(\d+(?:\.\d+)?)%\)/gi,
        (_m, kind, rate, drop, sec, cur) =>
            `${kind.toLowerCase() === "rapid" ? "Phát hiện tụt pin nhanh bất thường" : "Phát hiện tốc độ tiêu hao pin cao"}: ${rate}%/phút (giảm ${drop}% trong ${sec}s, hiện còn ${cur}%)`,
    ],
    [
        /Emergency battery exhaustion imminent:\s*(\d+(?:\.\d+)?)%\s*remaining/gi,
        "Nguy cơ cạn sạch pin khẩn cấp: chỉ còn $1%",
    ],
    [
        /Critical low battery threshold breached:\s*(\d+(?:\.\d+)?)%\s*remaining/gi,
        "Vi phạm ngưỡng pin thấp nguy cấp: còn $1%",
    ],
    [/Low battery warning:\s*(\d+(?:\.\d+)?)%\s*remaining/gi, "Cảnh báo pin yếu: còn $1%"],
    [
        /Battery critically low at (\d+(?:\.\d+)?)%\s*\(threshold (\d+(?:\.\d+)?)%\)/gi,
        "Pin sụt nguy cấp còn $1% (ngưỡng an toàn $2%)",
    ],
    [
        /Battery level (\d+(?:\.\d+)?)% below warning threshold (\d+(?:\.\d+)?)%/gi,
        "Mức pin $1% thấp hơn ngưỡng cảnh báo $2%",
    ],
    [
        /C2 link critically degraded\s*\/\s*lost:\s*signal\s*(\d+(?:\.\d+)?)%/gi,
        "Kết nối điều khiển C2 suy giảm nghiêm trọng / mất sóng: tín hiệu $1%",
    ],
    [
        /Weak C2 signal quality detected:\s*(\d+(?:\.\d+)?)%/gi,
        "Phát hiện chất lượng tín hiệu C2 yếu: $1%",
    ],
    [
        /GPS fix lost\s*\(HDOP=([^,)]+),\s*satellites=([^)]+)\)/gi,
        "Mất định vị GPS (HDOP=$1, vệ tinh=$2)",
    ],
    [
        /GPS precision degraded\s*\(HDOP=([^,)]+),\s*satellites=([^)]+)\)/gi,
        "Suy giảm độ chính xác GPS (HDOP=$1, vệ tinh=$2)",
    ],
    [
        /AIRCRAFT PROXIMITY ALERT:\s*(\S+)\s+at\s+(\d+(?:\.\d+)?)m/gi,
        "CẢNH BÁO TIẾP CẬN TÀU BAY: $1 ở khoảng cách $2m",
    ],
    [
        /Manned aircraft\s+(\S+)\s+detected within\s+(\d+(?:\.\d+)?)m/gi,
        "Phát hiện tàu bay có người lái $1 trong phạm vi $2m",
    ],
    [
        /CRITICAL mid-air separation loss with flight\s+(\S+)\s*\(horiz=(\d+(?:\.\d+)?)m,\s*vert=(\d+(?:\.\d+)?)m\)/gi,
        "NGUY CẤP mất phân cách trên không với chuyến bay $1 (ngang=$2m, đứng=$3m)",
    ],
    [
        /^Auto-resolved upon flight event\s+([A-Z0-9_]+)\s+at hub\s+(.+)$/i,
        (_m, ev, hub) =>
            `Tự động đóng sự cố khi ghi nhận sự kiện ${flightEventVi(ev)} tại trạm ${hub.trim()}`,
    ],
    [
        /^Auto-resolved upon flight event\s+([A-Z0-9_]+)$/i,
        (_m, ev) => `Tự động đóng sự cố khi ghi nhận sự kiện ${flightEventVi(ev)}`,
    ],
    [/^Flight completed at hub\s+(.+)$/i, "Chuyến bay đã hoàn tất hạ cánh tại trạm $1"],
    [/^Flight terminated\s*\(([^)]+)\)$/i, "Chuyến bay đã kết thúc ($1)"],
    [
        /^Flight completed or left active airspace$/i,
        "Chuyến bay đã hoàn tất hoặc rời khỏi không phận giám sát",
    ],
    [
        /^Manually resolved by operator(?:\s+(.+))?$/i,
        (_m, actor) =>
            actor
                ? `Đã được trực ban ${actor} đóng sự cố thủ công`
                : "Đã được trực ban đóng sự cố thủ công",
    ],
    [/^Action rejected by operator$/i, "Lệnh ứng phó đã bị trực ban từ chối"],
    [
        /^Emergency action rejected by operator\s+(.+)$/i,
        "Lệnh ứng phó khẩn cấp đã bị trực ban $1 từ chối",
    ],
    [
        /^Failed to dispatch failsafe command to drone$/i,
        "Không thể gửi lệnh ứng phó an toàn tới Drone",
    ],
    [
        /Insufficient battery for RTH\s*\(needed\s*(\d+)%,\s*have\s*(\d+)%\)/gi,
        "Không đủ pin để quay về trạm RTH (cần $1%, hiện có $2%)",
    ],
    [
        /^Insufficient battery to divert to nearest hub$/i,
        "Không đủ pin để chuyển hướng sang trạm Hub gần nhất",
    ],
    [
        /^System Default\s*-\s*Aircraft Collision Avoidance$/i,
        "Mặc định hệ thống — Tránh va chạm tàu bay",
    ],
    [
        /^System Default\s*-\s*Obstacle Collision Avoidance$/i,
        "Mặc định hệ thống — Tránh va chạm chướng ngại",
    ],
    [/^System Default\s*-\s*Motor Failure Failsafe$/i, "Mặc định hệ thống — Ứng phó hỏng động cơ"],
    [
        /^System Default\s*-\s*Motor Anomaly Advisory$/i,
        "Mặc định hệ thống — Cảnh báo bất thường động cơ",
    ],
    [/^System Default\s*-\s*GNSS Signal Lost$/i, "Mặc định hệ thống — Mất tín hiệu định vị GNSS"],
    [/^System Default\s*-\s*GNSS Degraded$/i, "Mặc định hệ thống — Suy giảm độ chính xác GNSS"],
    [/^System Default\s*-\s*Geofence Breach$/i, "Mặc định hệ thống — Vi phạm hành lang Geofence"],
    [
        /^System Default\s*-\s*Geofence Boundary Warning$/i,
        "Mặc định hệ thống — Cảnh báo tiệm cận Geofence",
    ],
    [/^System Default\s*-\s*Critical Battery Depletion$/i, "Mặc định hệ thống — Cạn pin nguy cấp"],
    [/^System Default\s*-\s*Low Battery Warning$/i, "Mặc định hệ thống — Cảnh báo pin yếu"],
    [/^System Default\s*-\s*Rapid Battery Discharge$/i, "Mặc định hệ thống — Tụt áp pin nhanh"],
    [/^System Default\s*-\s*C2 Signal Lost$/i, "Mặc định hệ thống — Mất kết nối điều khiển C2"],
    [/^System Default\s*-\s*Weak C2 Signal$/i, "Mặc định hệ thống — Tín hiệu C2 suy yếu"],
    [/^System Default\s*-\s*High Wind Advisory$/i, "Mặc định hệ thống — Khuyến cáo gió lớn"],
    [
        /^System Default\s*-\s*Low Visibility Advisory$/i,
        "Mặc định hệ thống — Khuyến cáo tầm nhìn thấp",
    ],
];

const CONFLICT_RULES: readonly PhraseRule[] = [
    [
        /Loss of separation between flight\s+(\S+)\s+and\s+(\S+)\s*\(horiz:\s*(\d+(?:\.\d+)?)m,\s*vert:\s*(\d+(?:\.\d+)?)m\)/gi,
        "Mất phân cách giữa chuyến bay $1 và $2 (ngang: $3m, đứng: $4m)",
    ],
    [
        /Live separation loss between flight\s+(\S+)\s+and\s+(\S+)/gi,
        "Mất phân cách trực tiếp giữa chuyến bay $1 và $2",
    ],
    [
        /Loss of separation with flight\s+(\S+)\s*\((\d+(?:\.\d+)?)m\)/gi,
        "Mất phân cách với chuyến bay $1 ($2m)",
    ],
    [
        /Loss of separation detected:\s*(\d+(?:\.\d+)?)m horizontal\.?/gi,
        "Phát hiện vi phạm khoảng cách phân cách ngang: $1m.",
    ],
    [
        /Predicted 4D separation loss with\s+(\S+)\s+at\s+(\S+)\s*\(horiz=(\d+(?:\.\d+)?)m\s*<\s*(\d+(?:\.\d+)?)m,\s*vert=(\d+(?:\.\d+)?)m\s*<\s*(\d+(?:\.\d+)?)m\)/gi,
        "Dự báo mất phân cách 4D với $1 lúc $2 (ngang=$3m < $4m, đứng=$5m < $6m)",
    ],
    [
        /Predicted separation loss:\s*(\d+(?:\.\d+)?)m horizontal\s*\(min\s*(\d+(?:\.\d+)?)m\)(?:,\s*(\d+(?:\.\d+)?)m vertical)?\.?/gi,
        (_m, h, minH, v) =>
            v
                ? `Dự báo vi phạm phân cách: ngang ${h}m (tối thiểu ${minH}m), đứng ${v}m.`
                : `Dự báo vi phạm phân cách ngang: ${h}m (tối thiểu ${minH}m).`,
    ],
    [
        /^4D trajectory is clear of all scheduled and active flights\.?$/i,
        "Quỹ đạo 4D thông thoáng, không giao cắt với các chuyến bay đang hoạt động hoặc đã lên lịch.",
    ],
    [
        /Detected (\d+) strategic 4D conflict\(s\)\.\s*Recommend delaying departure by \+(\d+)s or adjusting cruising altitude by \+(\d+)m\.?/gi,
        "Phát hiện $1 xung đột quỹ đạo 4D chiến lược. Khuyến nghị lùi giờ khởi hành +$2 giây hoặc tăng độ cao hành trình thêm +$3m.",
    ],
    [
        /Airspace breach detected for flight\s+(\S+)\s+into restricted zone/gi,
        "Phát hiện chuyến bay $1 xâm nhập vùng không phận hạn chế",
    ],
    [
        /^Flight breached restricted airspace zone$/i,
        "Chuyến bay đã xâm nhập vùng không phận hạn chế",
    ],
    [
        /^Flight violated airspace altitude or boundary rule$/i,
        "Chuyến bay vi phạm giới hạn độ cao hoặc ranh giới không phận",
    ],
    [
        /^Flight exited restricted or non-compliant airspace band$/i,
        "Chuyến bay đã ra khỏi dải không phận hạn chế / vi phạm",
    ],
    [
        /^Flights cleared safe separation buffer$/i,
        "Các chuyến bay đã khôi phục khoảng cách phân cách an toàn",
    ],
    [/^Conflict resolved by\s+(.+)$/i, "Xung đột đã được giải tỏa bởi $1"],
    [
        /Operational conflict \[([^\]]+)\] detected for flight\s+(\S+)/gi,
        "Phát hiện xung đột vận hành [$1] đối với chuyến bay $2",
    ],
    [
        /^Lateral offset (\d+)m outside restricted boundary to clear airspace violation immediately$/i,
        "Dịch ngang $1m ra ngoài ranh giới hạn chế để thoát vi phạm không phận ngay lập tức",
    ],
    [
        /^Hold position in hover while ATC issues reroute clearance$/i,
        "Bay lơ lửng giữ vị trí trong khi ATC cấp huấn lệnh đổi lộ trình",
    ],
    [
        /^Abort segment and return directly to departure hub$/i,
        "Hủy chặng bay hiện tại và quay thẳng về trạm Hub xuất phát",
    ],
    [
        /Adjust primary flight altitude from (\d+(?:\.\d+)?)m to (\d+(?:\.\d+)?)m for immediate vertical separation\s*\(>(\d+)m buffer\)/gi,
        "Điều chỉnh độ cao chuyến bay chính từ $1m lên $2m để tạo phân cách đứng tức thì (đệm >$3m)",
    ],
    [
        /Hold primary flight in hover for (\d+)s until conflicting traffic clears CPA/gi,
        "Cho chuyến bay chính bay lơ lửng chờ $1 giây đến khi lưu lượng xung đột thoát qua điểm CPA",
    ],
    [
        /^Apply (\d+)m lateral offset waypoint to establish wide horizontal separation$/i,
        "Áp dụng điểm tránh ngang $1m để thiết lập khoảng cách phân cách ngang an toàn",
    ],
    [
        /^Applied tactical resolution from Cockpit$/i,
        "Đã áp dụng phương án giải tỏa chiến thuật từ Buồng lái",
    ],
    [
        /Recommended:\s*Climb\s+(\S+)\s+\+(\d+)m\s+or\s+hold\s+(\S+)\s+for\s+(\d+)s\.?/gi,
        "Khuyến nghị: Tăng độ cao $1 thêm +$2m hoặc cho $3 bay lơ lửng chờ $4 giây.",
    ],
    [/Hold\s+(\S+)\s+for\s+(\d+)s/gi, "Cho $1 bay lơ lửng chờ $2 giây"],
    [/^Flight\s+(\S+):\s+/i, "Chuyến bay $1: "],
];

const AIRSPACE_RULES: readonly PhraseRule[] = [
    [
        /Point falls inside strictly forbidden airspace/gi,
        "Vị trí nằm trong vùng không phận cấm bay nghiêm ngặt",
    ],
    [
        /Point falls inside restricted airspace requiring special ATC clearance/gi,
        "Vị trí nằm trong vùng không phận hạn chế cần huấn lệnh ATC đặc biệt",
    ],
    [
        /(?:Point|Trajectory) altitude \((\d+(?:\.\d+)?)m\) exceeds ceiling limit \((\d+(?:\.\d+)?)m\) (?:of|in) zone '([^']+)'/gi,
        "Độ cao ($1m) vượt trần giới hạn ($2m) của vùng '$3'",
    ],
    [
        /(?:Point|Trajectory) altitude \((\d+(?:\.\d+)?)m\) falls below floor limit \((\d+(?:\.\d+)?)m\) (?:of|in) zone '([^']+)'/gi,
        "Độ cao ($1m) thấp hơn đáy giới hạn ($2m) của vùng '$3'",
    ],
    [
        /Trajectory(?: segment)? intersects strictly forbidden airspace '([^']+)'/gi,
        "Quỹ đạo cắt qua vùng không phận cấm bay nghiêm ngặt '$1'",
    ],
    [
        /Trajectory(?: segment)? intersects restricted zone '([^']+)'/gi,
        "Quỹ đạo cắt qua vùng không phận hạn chế '$1'",
    ],
    [
        /(?:Point|Trajectory) intersects openAIP (\S+) airspace '([^']+)'/gi,
        "Quỹ đạo cắt qua vùng không phận openAIP $1 '$2'",
    ],
    [/Entered restricted\/no-fly airspace zone:\s*(.+)$/gi, "Xâm nhập vùng hạn chế / cấm bay: $1"],
];

const FEASIBILITY_AND_MISSION_RULES: readonly PhraseRule[] = [
    [/^Reduce Payload$/i, "Giảm tải trọng mang theo"],
    [
        /Reduce payload from (\d+(?:\.\d+)?) kg to below (\d+(?:\.\d+)?) kg to meet energy margin threshold/gi,
        "Giảm tải trọng từ $1 kg xuống dưới $2 kg để đạt ngưỡng dự phòng năng lượng",
    ],
    [/^Plan Intermediate Charging Stop$/i, "Bổ sung điểm dừng sạc trung gian"],
    [
        /^Insert an intermediate vertiport waypoint for mid-mission battery recharging$/i,
        "Chèn thêm điểm dừng tại trạm Hub trung gian để sạc pin giữa chặng",
    ],
    [/^Assign Higher-Capacity Drone$/i, "Phân công Drone dung lượng cao hơn"],
    [
        /^Switch to an airframe model with larger battery capacity or greater wind tolerance$/i,
        "Chuyển sang mẫu Drone có dung lượng pin lớn hơn hoặc khả năng chịu gió cao hơn",
    ],
    [/^Await Favorable Wind Conditions$/i, "Chờ điều kiện gió thuận lợi"],
    [
        /Postpone mission until sustained wind drops below (\d+(?:\.\d+)?) m\/s \(currently (\d+(?:\.\d+)?) m\/s\)/gi,
        "Hoãn nhiệm vụ cho đến khi gió duy trì giảm xuống dưới $1 m/s (hiện tại $2 m/s)",
    ],
    [
        /Usable battery:\s*(\d+(?:\.\d+)?) Wh \(reserve 20%\),\s*Required:\s*(\d+(?:\.\d+)?) Wh \(cruise:\s*(\d+(?:\.\d+)?) Wh,\s*hover:\s*(\d+(?:\.\d+)?) Wh,\s*climb:\s*(\d+(?:\.\d+)?) Wh\)\.\s*Net margin:\s*(-?\d+(?:\.\d+)?)%\.\s*Verdict:\s*([A-Z_]+)\./gi,
        "Pin khả dụng: $1 Wh (dự phòng 20%), Cần thiết: $2 Wh (bay bằng: $3 Wh, bay lơ lửng: $4 Wh, lấy độ cao: $5 Wh). Biên độ ròng: $6%. Kết luận: $7.",
    ],
    [
        /Sustained wind speed of (\d+(?:\.\d+)?) m\/s exceeds airframe limit \((\d+(?:\.\d+)?) m\/s\)\./gi,
        "Tốc độ gió duy trì $1 m/s vượt giới hạn chịu gió của khung thân ($2 m/s).",
    ],
    [
        /Payload weight (\d+(?:\.\d+)?) kg exceeds max airframe payload \((\d+(?:\.\d+)?) kg\)\./gi,
        "Khối lượng tải trọng $1 kg vượt tải trọng tối đa của Drone ($2 kg).",
    ],
    [
        /Leg (\d+) has restricted airspace violations/gi,
        "Chặng $1 cắt qua vùng không phận hạn chế / cấm bay",
    ],
    [
        /Leg (\d+) exceeds single-charge battery capacity/gi,
        "Chặng $1 vượt quá dung lượng pin một lần sạc",
    ],
    [
        /Drone max payload \((\d+(?:\.\d+)?) kg\) is less than required payload \((\d+(?:\.\d+)?) kg\)/gi,
        "Tải trọng tối đa của Drone ($1 kg) nhỏ hơn tải trọng yêu cầu ($2 kg)",
    ],
    [
        /Insufficient payload capacity \((\d+(?:\.\d+)?) kg < (\d+(?:\.\d+)?) kg required\)/gi,
        "Không đủ tải trọng mang theo ($1 kg < yêu cầu $2 kg)",
    ],
    [
        /Sustained wind (\d+(?:\.\d+)?) m\/s exceeds 12\.0 m\/s (?:drone )?limit(?:\s*\(([^)]+)\))?/gi,
        (_m, spd, src) =>
            src
                ? `Gió duy trì ${spd} m/s vượt giới hạn 12.0 m/s (${src})`
                : `Gió duy trì ${spd} m/s vượt giới hạn an toàn Drone 12.0 m/s`,
    ],
    [
        /Sustained wind (\d+(?:\.\d+)?) m\/s exceeds 9\.0 m\/s caution threshold(?:\s*\(([^)]+)\))?/gi,
        (_m, spd, src) =>
            src
                ? `Gió duy trì ${spd} m/s vượt ngưỡng cảnh báo 9.0 m/s (${src})`
                : `Gió duy trì ${spd} m/s vượt ngưỡng cảnh báo 9.0 m/s`,
    ],
    [
        /Wind gusts (\d+(?:\.\d+)?) m\/s exceed 15\.0 m\/s (?:safety ceiling|limit)/gi,
        "Gió giật $1 m/s vượt giới hạn an toàn 15.0 m/s",
    ],
    [
        /Wind gusts (\d+(?:\.\d+)?) m\/s exceed 12\.0 m\/s caution threshold/gi,
        "Gió giật $1 m/s vượt ngưỡng cảnh báo 12.0 m/s",
    ],
    [
        /Visibility (\d+(?:\.\d+)?) m is below 1500 m (?:VLOS )?minimum/gi,
        "Tầm nhìn $1 m thấp hơn mức tối thiểu VLOS 1500 m",
    ],
    [
        /Visibility (\d+(?:\.\d+)?) m is below 5000 m VFR standard/gi,
        "Tầm nhìn $1 m thấp hơn tiêu chuẩn VFR 5000 m",
    ],
    [
        /Aerodrome flight category is (IFR|LIFR|MVFR)/gi,
        "Phân loại điều kiện bay sân bay đang ở mức $1",
    ],
    [
        /Thunderstorm activity detected\s*\(WMO code (\d+)\)/gi,
        "Phát hiện hoạt động dông bão (mã WMO $1)",
    ],
    [/Active precipitation at hub\s*\(([^)]+)\)/gi, "Đang có mưa tại khu vực trạm Hub ($1)"],
    [
        /Active severe SIGMET in FIR\s*(.+)$/gi,
        "Đang có cảnh báo thời tiết nguy hiểm SIGMET trong vùng FIR $1",
    ],
    [/^High Sustained Wind$/i, "Gió duy trì mạnh"],
    [/^Elevated Wind Speed$/i, "Tốc độ gió cao"],
    [/^Severe Wind Gusts$/i, "Gió giật mạnh nguy hiểm"],
    [/^Strong Wind Gusts$/i, "Gió giật mạnh"],
    [/^Low Visibility \(IFR\)$/i, "Tầm nhìn thấp (IFR)"],
    [/^Reduced Visibility \(MVFR\)$/i, "Tầm nhìn suy giảm (MVFR)"],
    [/^Thunderstorm Hazard$/i, "Nguy hiểm dông bão"],
    [/^Heavy Precipitation$/i, "Mưa lớn"],
];

const SIMULATION_RULES: readonly PhraseRule[] = [
    [
        /C2 command TAKEOFF applied:\s*ascending from (\d+(?:\.\d+)?)m to (\d+(?:\.\d+)?)m cruise altitude/gi,
        "Đã áp dụng lệnh C2 CẤT CÁNH: lấy độ cao từ $1m lên độ cao hành trình $2m",
    ],
    [
        /C2 command TAKEOFF applied:\s*aircraft already airborne at cruise altitude/gi,
        "Đã áp dụng lệnh C2 CẤT CÁNH: tàu bay đã ở độ cao hành trình trên không",
    ],
    [
        /C2 command (HOVER|PAUSE) applied:\s*holding current 3D loiter position(?:\s*for (\d+)s)?\.?/gi,
        (_m, cmd, sec) =>
            sec
                ? `Đã áp dụng lệnh C2 ${cmd.toUpperCase() === "HOVER" ? "BAY LƠ LỬNG" : "TẠM DỪNG"}: giữ vị trí lơ lửng 3D tại chỗ trong ${sec} giây.`
                : `Đã áp dụng lệnh C2 ${cmd.toUpperCase() === "HOVER" ? "BAY LƠ LỬNG" : "TẠM DỪNG"}: giữ vị trí lơ lửng 3D tại chỗ`,
    ],
    [
        /C2 command RESUME applied:\s*intercepting and resuming planned cruise trajectory/gi,
        "Đã áp dụng lệnh C2 TIẾP TỤC: nhập lại và tiếp tục quỹ đạo hành trình kế hoạch",
    ],
    [
        /C2 command RESUME applied:\s*resuming planned survey corridor\.?/gi,
        "Đã áp dụng lệnh C2 TIẾP TỤC: quay lại hành lang khảo sát theo kế hoạch.",
    ],
    [
        /C2 command EMERGENCY_STOP applied:\s*initiating rapid failsafe descent \(([^)]+)\)/gi,
        "Đã áp dụng lệnh C2 DỪNG KHẨN CẤP: kích hoạt hạ độ cao khẩn cấp ($1)",
    ],
    [
        /C2 command LAND applied:\s*initiating controlled vertical descent \(([^)]+)\)/gi,
        "Đã áp dụng lệnh C2 HẠ CÁNH: bắt đầu hạ cánh thẳng đứng có kiểm soát ($1)",
    ],
    [
        /C2 command RTL applied:\s*executing 3D return-to-home via (\d+(?:\.\d+)?)m AGL to \[([^\]]+)\]\s*->\s*0m touchdown/gi,
        "Đã áp dụng lệnh C2 VỀ TRẠM (RTL): quay về trạm gốc ở độ cao $1m AGL tới [$2] → đáp 0m",
    ],
    [
        /Joined ongoing 3D return-to-home trajectory to departure hub/gi,
        "Tiếp tục bám quỹ đạo 3D quay về trạm Hub xuất phát đang thực thi",
    ],
    [
        /C2 command GOTO applied:\s*diverting to hub (\S+) via (\d+(?:\.\d+)?)m AGL \[([^\]]+)\]\s*->\s*0m touchdown/gi,
        "Đã áp dụng lệnh C2 CHUYỂN HƯỚNG: bay về trạm $1 ở độ cao $2m AGL [$3] → đáp 0m",
    ],
    [
        /C2 command GOTO applied:\s*diverting to \[([^\]]+)\]/gi,
        "Đã áp dụng lệnh C2 GOTO: điều hướng tới tọa độ [$1]",
    ],
    [
        /C2 command SET_ALTITUDE applied:\s*adjusting target altitude to (\d+(?:\.\d+)?)m(?:\s*for separation)?\.?/gi,
        (m, alt) =>
            /for separation/i.test(m)
                ? `Đã áp dụng lệnh C2 ĐẶT ĐỘ CAO: điều chỉnh độ cao mục tiêu lên ${alt}m để đảm bảo phân cách.`
                : `Đã áp dụng lệnh C2 ĐẶT ĐỘ CAO: điều chỉnh độ cao mục tiêu sang ${alt}m`,
    ],
    [
        /C2 command CONFIGURE applied:\s*updated cruise speed to (\d+(?:\.\d+)?) m\/s/gi,
        "Đã áp dụng lệnh C2 CẤU HÌNH: cập nhật tốc độ hành trình sang $1 m/s",
    ],
    [
        /C2 command CONFIGURE applied:\s*updated flight controller parameters/gi,
        "Đã áp dụng lệnh C2 CẤU HÌNH: đã cập nhật tham số bộ điều khiển bay",
    ],
    [
        /C2 command SET_HOME applied:\s*updated home pad to \[([^\]]+)\]/gi,
        "Đã áp dụng lệnh C2 ĐẶT TRẠM GỐC: cập nhật tọa độ bãi đáp gốc sang [$1]",
    ],
    [
        /C2 command SET_HOME applied:\s*updated home hub configuration/gi,
        "Đã áp dụng lệnh C2 ĐẶT TRẠM GỐC: đã cập nhật cấu hình trạm Hub gốc",
    ],
    [
        /Armed conditional emergency scenario '([^']+)'\s*\((.+)\)/gi,
        (_m, name, detail) =>
            `Đã gài kịch bản sự cố có điều kiện '${translateScenarioTitleVi(name)}' (${translateScenarioDetailVi(detail)})`,
    ],
    [
        /Injected emergency scenario '?([^'(]+?)'?\s*\(([^)]+)\)\.?/gi,
        (_m, name, detail) =>
            `Đã kích hoạt kịch bản sự cố '${translateScenarioTitleVi(name)}' (${translateScenarioDetailVi(detail)}).`,
    ],
    [
        /Emergency scenario cleared\.\s*Restored (?:normal flight parameters|nominal GNSS lock and corridor tracking)\.?/gi,
        "Đã xóa kịch bản sự cố. Khôi phục thông số bay và bám hành lang ổn định.",
    ],
    [
        /Onboard autopilot activated (LAND|RTL) failsafe(?: to departure hub)? after (\d+)s of C2 link loss/gi,
        (_m, act, sec) =>
            `Autopilot trên khoang đã tự kích hoạt cứu nạn (${actionVi(act)}) sau ${sec} giây mất kết nối C2`,
    ],
    [
        /Onboard C2 link-loss failsafe vertical landing(?:\s*-\s*touchdown completed at alt (\d+(?:\.\d+)?)m)?/gi,
        (_m, alt) =>
            alt != null
                ? `Hạ cánh thẳng đứng an toàn do mất sóng C2 — đã tiếp đất tại độ cao ${alt}m`
                : "Hạ cánh thẳng đứng an toàn do mất sóng C2",
    ],
    [
        /Executed emergency stop motor cut \/ rapid failsafe descent(?:\s*-\s*touchdown completed at alt (\d+(?:\.\d+)?)m)?/gi,
        (_m, alt) =>
            alt != null
                ? `Đã ngắt động cơ dừng khẩn cấp / hạ độ cao nhanh — tiếp đất tại độ cao ${alt}m`
                : "Đã ngắt động cơ dừng khẩn cấp / hạ độ cao an toàn nhanh",
    ],
    [
        /Executed C2 controlled vertical landing(?:\s*-\s*touchdown completed at alt (\d+(?:\.\d+)?)m)?/gi,
        (_m, alt) =>
            alt != null
                ? `Đã hạ cánh thẳng đứng có kiểm soát theo lệnh C2 — tiếp đất tại độ cao ${alt}m`
                : "Đã thực hiện hạ cánh thẳng đứng có kiểm soát theo lệnh C2",
    ],
    [
        /Critical battery emergency protocol LAND\s*-\s*touchdown completed at alt (\d+(?:\.\d+)?)m\.?/gi,
        "Quy trình khẩn cấp pin nguy cấp (HẠ CÁNH) — đã tiếp đất an toàn tại độ cao $1m.",
    ],
    [
        /Emergency vertical landing completed at ground level/gi,
        "Đã hoàn tất hạ cánh khẩn cấp thẳng đứng xuống mặt đất",
    ],
    [
        /Return-to-home touchdown completed at departure hub/gi,
        "Đã hoàn tất hạ cánh quay về trạm Hub xuất phát (RTH)",
    ],
    [
        /Diverted landing completed at alternate hub/gi,
        "Đã hoàn tất hạ cánh chuyển hướng tại trạm Hub dự phòng",
    ],
    [
        /Flight simulation completed at final waypoint/gi,
        "Đã hoàn tất mô phỏng chuyến bay tại điểm hành trình cuối",
    ],
    [
        /Controlled vertical landing completed at hub \(0m AGL\)/gi,
        "Đã hoàn tất hạ cánh thẳng đứng có kiểm soát tại trạm Hub (0m AGL)",
    ],
    [
        /Virtual flight reached (.+?) and landed cleanly at alt (\d+(?:\.\d+)?)m\.?/gi,
        "Chuyến bay mô phỏng đã tới $1 và hạ cánh an toàn ở độ cao $2m.",
    ],
    [/Leg (\d+) completed at (.+?)\.?$/i, "Đã hoàn tất chặng $1 tại điểm dừng $2."],
    [
        /Drone reached ground after motor failure\.\s*Flight simulation stopped\.?/gi,
        "Tàu bay đã tiếp đất sau sự cố hỏng động cơ. Đã dừng phiên mô phỏng.",
    ],
    [
        /Drone battery depleted to 0\.0%\.\s*Flight simulation stopped and telemetry downlink severed\.?/gi,
        "Pin tàu bay đã cạn về 0.0%. Đã dừng mô phỏng và ngắt đường truyền viễn trắc.",
    ],
    [/^Simulation session temporarily paused$/i, "Đã tạm dừng phiên mô phỏng"],
    [/^Simulation session resumed flight path$/i, "Đã tiếp tục hành trình phiên mô phỏng"],
    [/^Simulation session stopped by operator$/i, "Trực ban đã dừng phiên mô phỏng"],
    [
        /^(?:Simulation )?[Tt]ime scale updated to (\d+(?:\.\d+)?)x\.?$/,
        "Đã cập nhật tốc độ thời gian mô phỏng sang $1x.",
    ],
    [
        /Preempted by operator command\s+([A-Z0-9_]+)/gi,
        (_m, cmd) => `Bị thay thế bởi lệnh điều khiển ${actionVi(cmd)}`,
    ],
];

const SEED_AND_COMMAND_RULES: readonly PhraseRule[] = [
    [
        /Superseded by P(\d+)\s+([A-Z0-9_]+)\s+emergency command/gi,
        (_m, prio, cmd) => `Bị thay thế bởi lệnh khẩn cấp ưu tiên P${prio} (${actionVi(cmd)})`,
    ],
    [
        /Device (\S+) unreachable after (\d+) retries\s*\(([^)]+)\)/gi,
        "Thiết bị $1 không phản hồi sau $2 lần thử lại ($3)",
    ],
    [
        /Geofence boundary proximity warning:\s*planned route buffer passes within (\d+(?:\.\d+)?)m of (.+?) hazard zone \(([^)]+)\)\.?/gi,
        "Cảnh báo tiệm cận ranh giới Geofence: vùng đệm lộ trình đi qua cách vùng nguy hiểm $2 ($3) $1m.",
    ],
    [
        /Pre-flight geofence buffer advisory:\s*(\S+) wind-drift envelope sits (\d+(?:\.\d+)?)m \w+ of prohibited zone (\S+?)\.?$/gi,
        "Khuyến cáo vùng đệm Geofence trước bay: biên trôi gió của chuyến $1 nằm cách vùng cấm $3 $2m.",
    ],
    [
        /Incident (\S+) awaiting operator confirmation:\s*([A-Z0-9_]+) advised near (.+?) hazard buffer\.?/gi,
        (_m, inc, act, zone) =>
            `Sự cố ${inc} đang chờ trực ban xác nhận: khuyến nghị ${actionVi(act)} gần vùng đệm nguy hiểm ${zone}.`,
    ],
    [
        /Critical battery depletion reached (\d+(?:\.\d+)?)% remaining during rapid discharge event\.\s*Autonomous ([A-Z0-9_]+) executed safely\.?/gi,
        (_m, pct, act) =>
            `Pin suy giảm nguy cấp còn ${pct}% khi tụt áp nhanh. Đã tự động thực thi lệnh ${actionVi(act)} an toàn.`,
    ],
    [
        /Safe vertical touchdown completed at open riverfront pad \(([^)]+)\)\.\s*Cold-chain medical box recovered intact\.?/gi,
        "Đã hạ cánh thẳng đứng an toàn tại bãi đáp ven sông ($1). Thùng y tế bảo quản lạnh đã được thu hồi nguyên vẹn.",
    ],
    [
        /Critical battery depletion \((\d+(?:\.\d+)?)%\) detected on (\S+);\s*autonomous emergency landing completed\.?/gi,
        "Phát hiện cạn pin nguy cấp ($1%) trên chuyến $2; đã hoàn tất hạ cánh khẩn cấp tự động.",
    ],
    [
        /Motor #(\d+) transient vibration spike \(([^)]+)\) observed during mid-river loiter;\s*hover stabilization restored nominal RPM\.?/gi,
        "Ghi nhận xung rung động tức thời trên động cơ #$1 ($2) khi bay lơ lửng giữa sông; chế độ ổn định lơ lửng đã khôi phục vòng tua chuẩn.",
    ],
    [
        /Oscillation subsided after (\d+)s stabilized hover;\s*flight completed safely to (.+?)\.?$/gi,
        "Dao động đã giảm sau $1 giây bay lơ lửng ổn định; chuyến bay hoàn tất an toàn về $2.",
    ],
    [
        /Transient GNSS HDOP rose to (\d+(?:\.\d+)?)\s*\(satellites=(\d+)\) near riverfront high-rises;\s*optical-flow lock held until RTK re-acquired\.?/gi,
        "Chỉ số GNSS HDOP tăng tạm thời lên $1 (vệ tinh=$2) gần cụm cao tầng ven sông; đã giữ vị trí bằng cảm biến quang học cho tới khi khóa lại RTK.",
    ],
    [
        /GNSS lock recovered to (\d+) satellites \(HDOP (\d+(?:\.\d+)?)\) within (\d+) seconds;\s*normal transit resumed\.?/gi,
        "Đã khôi phục tín hiệu GNSS đạt $1 vệ tinh (HDOP $2) sau $3 giây; tiếp tục hành trình bình thường.",
    ],
    [
        /Automated anemometer spike \(([^)]+)\) flagged on (.+?);\s*confirmed sensor calibration test\.?/gi,
        "Ghi nhận xung gió tức thời từ cảm biến ($1) tại $2; đã xác nhận là bài kiểm tra hiệu chuẩn cảm biến.",
    ],
    [
        /^False positive verified with vertiport ground crew\.?$/i,
        "Đã xác minh cảnh báo giả cùng đội kỹ thuật mặt đất tại trạm Hub.",
    ],
    [/^Rejected by ATC:\s*(.+)$/i, "ATC từ chối: $1"],
    [
        /Pre-departure trajectory review:\s*wind-drift buffer for (\S+) approaches (.+?) \(([^)]+)\) \w+ perimeter by (\d+(?:\.\d+)?)m\.?/gi,
        "Rà soát quỹ đạo trước khởi hành: biên trôi gió của chuyến $1 tiệm cận ranh giới vùng cấm $2 ($3) ở khoảng cách $4m.",
    ],
    [
        /Tactical separation conflict between (\S+) and (\S+) over (.+?);\s*resolved by climbing (\S+) to (\d+(?:\.\d+)?)m\.?/gi,
        "Xung đột phân cách chiến thuật giữa $1 và $2 trên khu vực $3; đã giải tỏa bằng cách nâng độ cao $4 lên $5m.",
    ],
    [
        /Proximity notice:\s*(\S+) deviated (\d+(?:\.\d+)?)m \w+ of corridor under crosswind gust;\s*corrective GOTO issued\.?/gi,
        "Cảnh báo tiệm cận: chuyến $1 lệch $2m khỏi hành lang do gió ngang giật; đã phát lệnh GOTO hiệu chỉnh.",
    ],
    [
        /Conformance watchdog flagged critical battery depletion \((\d+(?:\.\d+)?)%\) on (\S+);\s*resolved after safe emergency landing\.?/gi,
        "Hệ thống giám sát hành lang ghi nhận pin nguy cấp ($1%) trên chuyến $2; đã đóng sau khi hạ cánh khẩn cấp an toàn.",
    ],
    [
        /Transient convective gust advisory from (\S+) METAR dissipated prior to departure window\.?/gi,
        "Khuyến cáo gió giật đối lưu tức thời từ bản tin METAR $1 đã tan trước khung giờ khởi hành.",
    ],
    [
        /Projected loss of separation between (\S+) and (\S+)\s*\(CPA:\s*(\d+(?:\.\d+)?)m in (\d+)s\)\.?/gi,
        "Dự báo mất phân cách giữa $1 và $2 (CPA: $3m sau $4 giây).",
    ],
    [
        /Flight (\S+) exceeded lateral containment corridor by (\d+(?:\.\d+)?)m\s*\(limit:\s*(\d+(?:\.\d+)?)m\)\.?/gi,
        "Chuyến bay $1 lệch ngang ra ngoài hành lang giới hạn $2m (ngưỡng: $3m).",
    ],
    [
        /Drone (\S+) placed in MAINTENANCE status after passing (\d+)-day rotor inspection interval\.?/gi,
        "Tàu bay $1 đã chuyển sang trạng thái BẢO TRÌ sau chu kỳ kiểm tra cánh quay $2 ngày.",
    ],
    [
        /Transient wind gust (\d+(?:\.\d+)?) m\/s reported at (.+?)\.?$/gi,
        "Ghi nhận gió giật tức thời $1 m/s tại $2.",
    ],
];

export const VI_SERVER_TEXT_RULES: readonly PhraseRule[] = [
    ...CONFORMANCE_RULES,
    ...EMERGENCY_RULES,
    ...CONFLICT_RULES,
    ...AIRSPACE_RULES,
    ...FEASIBILITY_AND_MISSION_RULES,
    ...SIMULATION_RULES,
    ...SEED_AND_COMMAND_RULES,
];
