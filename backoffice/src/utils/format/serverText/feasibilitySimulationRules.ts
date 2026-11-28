import { actionVi } from "./labels";
import type { PhraseRule } from "./types";

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

export function buildFeasibilityAndMissionRules(): readonly PhraseRule[] {
    return [
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
}

export function buildSimulationRules(): readonly PhraseRule[] {
    return [
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
}
