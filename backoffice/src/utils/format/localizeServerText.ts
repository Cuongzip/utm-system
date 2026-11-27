import { getCurrentLocale, type AppLocale } from "@/i18n";

const VI_ACTION_MAP: Record<string, string> = {
    LAND: "Hạ cánh",
    RTH: "Về trạm (RTH)",
    RTL: "Về trạm (RTH)",
    HOVER: "Bay treo",
    EMERGENCY_STOP: "Ngắt khẩn cấp",
    DIVERT: "Chuyển hướng",
    HOLD: "Giữ vị trí",
};

const VI_ALERT_PHRASE_RULES: Array<[RegExp, string | ((...args: string[]) => string)]> = [
    [
        /^AUTO FAILSAFE:\s*([A-Z0-9_-]+)\s+executing for\s+[a-z0-9_]+\.\s*/i,
        (_m, action) => `Tự động cứu nạn (${VI_ACTION_MAP[action.toUpperCase()] ?? action}) · `,
    ],
    [
        /Rapid uncontrolled descent detected \(([^)]+)\):\s*suspected motor failure/i,
        "Phát hiện hạ độ cao mất kiểm soát ($1): nghi ngờ lỗi động cơ",
    ],
    [
        /Telemetry (?:stream absent|lost) for (\d+)\s*seconds?\s*\(exceeded (\d+)s emergency threshold\)/i,
        "Mất luồng viễn trắc trong $1 giây (vượt ngưỡng khẩn cấp $2 giây)",
    ],
    [
        /Telemetry (?:stream absent|lost) for (\d+)\s*seconds?/i,
        "Mất tín hiệu viễn trắc trong $1 giây",
    ],
    [
        /Battery critically low at (\d+(?:\.\d+)?)%\s*\(threshold (\d+(?:\.\d+)?)%\)/i,
        "Pin sụt nguy cấp còn $1% (ngưỡng an toàn $2%)",
    ],
    [
        /Battery level (\d+(?:\.\d+)?)% below warning threshold (\d+(?:\.\d+)?)%/i,
        "Mức pin $1% thấp hơn ngưỡng cảnh báo $2%",
    ],
    [
        /Lateral deviation (\d+(?:\.\d+)?)m exceeds corridor limit (\d+(?:\.\d+)?)m/i,
        "Độ lệch ngang $1m vượt giới hạn hành lang $2m",
    ],
    [
        /Vertical deviation (\d+(?:\.\d+)?)m exceeds altitude tolerance (\d+(?:\.\d+)?)m/i,
        "Độ lệch cao độ $1m vượt dung sai $2m",
    ],
    [/Entered restricted\/no-fly airspace zone:\s*(.+)$/i, "Xâm nhập vùng hạn chế / cấm bay: $1"],
    [
        /Predicted separation loss:\s*(\d+(?:\.\d+)?)m horizontal\s*\(min\s*(\d+(?:\.\d+)?)m\)(?:,\s*(\d+(?:\.\d+)?)m vertical)?\.?/i,
        (_m, h, minH, v) =>
            v
                ? `Dự báo vi phạm phân cách: ngang ${h}m (tối thiểu ${minH}m), đứng ${v}m.`
                : `Dự báo vi phạm phân cách ngang: ${h}m (tối thiểu ${minH}m).`,
    ],
    [
        /Loss of separation detected:\s*(\d+(?:\.\d+)?)m horizontal\.?/i,
        "Phát hiện vi phạm khoảng cách phân cách ngang: $1m.",
    ],
    [
        /Recommended:\s*Climb\s+(\S+)\s+\+(\d+)m\s+or\s+hold\s+(\S+)\s+for\s+(\d+)s\.?/i,
        "Khuyến nghị: Tăng độ cao $1 thêm +$2m hoặc cho $3 bay chờ $4 giây.",
    ],
    [/Hold\s+(\S+)\s+for\s+(\d+)s/i, "Cho $1 bay chờ $2 giây"],
    [
        /Leg (\d+) has restricted airspace violations/i,
        "Chặng $1 cắt qua vùng không phận hạn chế / cấm bay",
    ],
    [
        /Leg (\d+) exceeds single-charge battery capacity/i,
        "Chặng $1 vượt quá dung lượng pin một lần sạc",
    ],
];

export function localizeServerText(
    raw?: string | null,
    locale: AppLocale = getCurrentLocale()
): string {
    if (!raw) return "";
    if (locale !== "vi") {
        return raw
            .replace(
                /^AUTO FAILSAFE:\s*([A-Z0-9_-]+)\s+executing for\s+[a-z0-9_]+\.\s*/i,
                "Auto failsafe ($1) · "
            )
            .replace(/\b([a-z]+)_([a-z0-9_]+)\b/g, (match) => match.replace(/_/g, " "));
    }

    let result = raw;
    for (const [pattern, replacement] of VI_ALERT_PHRASE_RULES) {
        if (typeof replacement === "string") {
            result = result.replace(pattern, replacement);
        } else {
            result = result.replace(pattern, replacement);
        }
    }
    return result;
}
