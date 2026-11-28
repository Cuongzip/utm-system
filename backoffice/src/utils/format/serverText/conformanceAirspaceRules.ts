import type { PhraseRule } from "./types";

export function buildConformanceRules(): readonly PhraseRule[] {
    return [
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
        [
            /Waypoint #(\d+) requires operator confirmation/gi,
            "Điểm bay #$1 yêu cầu trực ban xác nhận",
        ],
    ];
}

export function buildAirspaceRules(): readonly PhraseRule[] {
    return [
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
        [
            /Entered restricted\/no-fly airspace zone:\s*(.+)$/gi,
            "Xâm nhập vùng hạn chế / cấm bay: $1",
        ],
    ];
}
