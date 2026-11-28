import { actionVi } from "./labels";
import type { PhraseRule } from "./types";

export function buildSeedAndCommandRules(): readonly PhraseRule[] {
    return [
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
}
