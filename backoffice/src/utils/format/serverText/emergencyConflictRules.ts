import { actionVi, flightEventVi } from "./labels";
import type { PhraseRule } from "./types";

export function buildEmergencyRules(): readonly PhraseRule[] {
    return [
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
        [
            /^System Default\s*-\s*Motor Failure Failsafe$/i,
            "Mặc định hệ thống — Ứng phó hỏng động cơ",
        ],
        [
            /^System Default\s*-\s*Motor Anomaly Advisory$/i,
            "Mặc định hệ thống — Cảnh báo bất thường động cơ",
        ],
        [
            /^System Default\s*-\s*GNSS Signal Lost$/i,
            "Mặc định hệ thống — Mất tín hiệu định vị GNSS",
        ],
        [/^System Default\s*-\s*GNSS Degraded$/i, "Mặc định hệ thống — Suy giảm độ chính xác GNSS"],
        [
            /^System Default\s*-\s*Geofence Breach$/i,
            "Mặc định hệ thống — Vi phạm hành lang Geofence",
        ],
        [
            /^System Default\s*-\s*Geofence Boundary Warning$/i,
            "Mặc định hệ thống — Cảnh báo tiệm cận Geofence",
        ],
        [
            /^System Default\s*-\s*Critical Battery Depletion$/i,
            "Mặc định hệ thống — Cạn pin nguy cấp",
        ],
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
}

export function buildConflictRules(): readonly PhraseRule[] {
    return [
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
}
