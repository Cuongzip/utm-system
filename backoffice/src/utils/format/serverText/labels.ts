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

export function actionVi(raw: string): string {
    const key = raw.trim().toUpperCase();
    return VI_RESPONSE_ACTION_LABELS[key] ?? raw;
}

export function flightEventVi(raw: string): string {
    const key = raw.trim().toUpperCase();
    return FLIGHT_LIFECYCLE_EVENT_LABELS[key]?.vi ?? raw.replace(/_/g, " ");
}
