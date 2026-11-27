package com.utm.flight.service;

import com.utm.commonlibrary.utils.LocaleUtils;
import com.utm.commonlibrary.utils.LocaleUtils;
import com.utm.flight.config.FeasibilityConfig;
import com.utm.flight.model.enumeration.SolutionKind;
import com.utm.flight.model.enumeration.Verdict;
import com.utm.flight.viewmodel.feasibility.DroneEnergySpecVm;
import com.utm.flight.viewmodel.feasibility.EnergyCalculationResultVm;
import com.utm.flight.viewmodel.feasibility.EnvConditionsVm;
import com.utm.flight.viewmodel.feasibility.FeasibilitySolutionVm;
import com.utm.flight.viewmodel.feasibility.MissionProfileVm;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@Slf4j
public class EnergyModelServiceImpl implements EnergyModelService {

    @Override
    public EnergyCalculationResultVm calculateEnergy(
            DroneEnergySpecVm droneSpec,
            MissionProfileVm missionProfile,
            EnvConditionsVm envConditions) {

        double batteryCapacityWh = (droneSpec != null && droneSpec.batteryCapacityWh() != null && droneSpec.batteryCapacityWh() > 0)
                ? droneSpec.batteryCapacityWh()
                : 500.0;

        double batteryHealthPct = (droneSpec != null && droneSpec.batteryHealthPct() != null && droneSpec.batteryHealthPct() > 0)
                ? droneSpec.batteryHealthPct()
                : FeasibilityConfig.DEFAULT_BATTERY_HEALTH_PCT;

        double hoverPowerW = (droneSpec != null && droneSpec.hoverPowerW() != null && droneSpec.hoverPowerW() > 0)
                ? droneSpec.hoverPowerW()
                : FeasibilityConfig.DEFAULT_HOVER_POWER_W;

        double cruisePowerW = (droneSpec != null && droneSpec.cruisePowerW() != null && droneSpec.cruisePowerW() > 0)
                ? droneSpec.cruisePowerW()
                : FeasibilityConfig.DEFAULT_CRUISE_POWER_W;

        double cruiseSpeedMs = (droneSpec != null && droneSpec.cruiseSpeedMs() != null && droneSpec.cruiseSpeedMs() > 0)
                ? droneSpec.cruiseSpeedMs()
                : FeasibilityConfig.DEFAULT_CRUISE_SPEED_MS;

        double windToleranceMs = (droneSpec != null && droneSpec.windToleranceMs() != null && droneSpec.windToleranceMs() > 0)
                ? droneSpec.windToleranceMs()
                : FeasibilityConfig.DEFAULT_WIND_TOLERANCE_MS;

        double maxPayloadKg = (droneSpec != null && droneSpec.maxPayloadKg() != null && droneSpec.maxPayloadKg() > 0)
                ? droneSpec.maxPayloadKg()
                : FeasibilityConfig.DEFAULT_MAX_PAYLOAD_KG;

        double currentBatteryPct = (droneSpec != null && droneSpec.currentBatteryPct() != null
                && droneSpec.currentBatteryPct() > 0)
                        ? Math.min(100.0, droneSpec.currentBatteryPct())
                        : 100.0;

        double usableWh = batteryCapacityWh
                * (batteryHealthPct / 100.0)
                * (currentBatteryPct / 100.0)
                * (1.0 - FeasibilityConfig.RESERVE_FRACTION);

        double distanceM = missionProfile != null ? Math.max(0.0, missionProfile.distanceM()) : 0.0;
        double hoverTimeS = missionProfile != null ? Math.max(0.0, missionProfile.hoverTimeS()) : FeasibilityConfig.DEFAULT_HOVER_TIME_S;
        double payloadKg = missionProfile != null ? Math.max(0.0, missionProfile.payloadKg()) : 0.0;

        double payloadFactor = 1.0 + FeasibilityConfig.K_PAYLOAD * (payloadKg / maxPayloadKg);

        Double windSpeedMs = envConditions != null ? envConditions.windSpeedMs() : null;
        double windFactor = 1.0;
        boolean windExceeded = false;
        if (windSpeedMs != null && windSpeedMs > 0) {
            windFactor = 1.0 + FeasibilityConfig.K_WIND * (windSpeedMs / windToleranceMs);
            if (windSpeedMs > windToleranceMs) {
                windExceeded = true;
            }
        }

        double cruiseTimeHours = (distanceM / cruiseSpeedMs) / 3600.0;
        double cruiseWh = cruisePowerW * cruiseTimeHours * payloadFactor * windFactor;

        double hoverTimeHours = hoverTimeS / 3600.0;
        double hoverWh = hoverPowerW * hoverTimeHours * payloadFactor;

        double climbWh = (cruiseWh + hoverWh) * FeasibilityConfig.CLIMB_SURCHARGE;

        double requiredWh = cruiseWh + hoverWh + climbWh;

        double marginPct = usableWh > 0 ? ((usableWh - requiredWh) / usableWh) * 100.0 : -100.0;

        boolean payloadExceeded = payloadKg > maxPayloadKg;

        Verdict verdict;
        if (windExceeded || payloadExceeded || marginPct < 0.0) {
            verdict = Verdict.NO_GO;
        } else if (marginPct < FeasibilityConfig.GO_THRESHOLD_PCT) {
            verdict = Verdict.MARGINAL;
        } else {
            verdict = Verdict.GO;
        }

        boolean hasCompleteSpecs = droneSpec != null
                && droneSpec.batteryCapacityWh() != null && droneSpec.batteryCapacityWh() > 0
                && droneSpec.hoverPowerW() != null && droneSpec.hoverPowerW() > 0
                && droneSpec.cruisePowerW() != null && droneSpec.cruisePowerW() > 0
                && droneSpec.cruiseSpeedMs() != null && droneSpec.cruiseSpeedMs() > 0;
        String confidence;
        if (droneSpec == null || droneSpec.batteryCapacityWh() == null) {
            confidence = "LOW";
        } else if (!hasCompleteSpecs || windSpeedMs == null) {
            confidence = "MEDIUM";
        } else {
            confidence = "HIGH";
        }

        boolean vi = LocaleUtils.isVietnamese();
        List<FeasibilitySolutionVm> solutions = new ArrayList<>();
        if (verdict != Verdict.GO) {
            if (payloadKg > 0) {
                solutions.add(new FeasibilitySolutionVm(
                        SolutionKind.REDUCE_PAYLOAD,
                        vi ? "Giảm tải trọng mang theo" : "Reduce Payload",
                        vi
                                ? String.format(Locale.ROOT, "Giảm tải trọng từ %.1f kg xuống dưới %.1f kg để đạt ngưỡng dự phòng năng lượng",
                                        payloadKg, Math.max(0.0, payloadKg * 0.7))
                                : String.format(Locale.ROOT, "Reduce payload from %.1f kg to below %.1f kg to meet energy margin threshold",
                                        payloadKg, Math.max(0.0, payloadKg * 0.7))
                ));
            }
            if (distanceM > 3000.0) {
                solutions.add(new FeasibilitySolutionVm(
                        SolutionKind.CHARGING_STOP,
                        vi ? "Bổ sung điểm dừng sạc trung gian" : "Plan Intermediate Charging Stop",
                        vi
                                ? "Chèn thêm điểm hành trình tại Hub/Vertiport trung gian để sạc pin giữa chặng"
                                : "Insert an intermediate vertiport waypoint for mid-mission battery recharging"
                ));
            }
            solutions.add(new FeasibilitySolutionVm(
                    SolutionKind.OTHER_DRONE,
                    vi ? "Phân công Drone dung lượng cao hơn" : "Assign Higher-Capacity Drone",
                    vi
                            ? "Chuyển sang mẫu Drone có dung lượng pin lớn hơn hoặc khả năng chịu gió cao hơn"
                            : "Switch to an airframe model with larger battery capacity or greater wind tolerance"
            ));
            if (windSpeedMs != null && windSpeedMs > (windToleranceMs * 0.7)) {
                solutions.add(new FeasibilitySolutionVm(
                        SolutionKind.AWAIT_WIND,
                        vi ? "Chờ điều kiện gió thuận lợi" : "Await Favorable Wind Conditions",
                        vi
                                ? String.format(Locale.ROOT, "Hoãn nhiệm vụ cho đến khi gió duy trì giảm xuống dưới %.1f m/s (hiện tại %.1f m/s)",
                                        windToleranceMs * 0.7, windSpeedMs)
                                : String.format(Locale.ROOT, "Postpone mission until sustained wind drops below %.1f m/s (currently %.1f m/s)",
                                        windToleranceMs * 0.7, windSpeedMs)
                ));
            }
        }

        StringBuilder explanation = new StringBuilder(vi
                ? String.format(Locale.ROOT,
                        "Pin khả dụng: %.1f Wh (dự phòng 20%%), Cần thiết: %.1f Wh (bay bằng: %.1f Wh, treo tại chỗ: %.1f Wh, lấy độ cao: %.1f Wh). Biên độ ròng: %.1f%%. Kết luận: %s.",
                        usableWh, requiredWh, cruiseWh, hoverWh, climbWh, marginPct, verdict.name())
                : String.format(Locale.ROOT,
                        "Usable battery: %.1f Wh (reserve 20%%), Required: %.1f Wh (cruise: %.1f Wh, hover: %.1f Wh, climb: %.1f Wh). Net margin: %.1f%%. Verdict: %s.",
                        usableWh, requiredWh, cruiseWh, hoverWh, climbWh, marginPct, verdict.name()));

        if (windExceeded) {
            explanation.append(vi
                    ? String.format(Locale.ROOT, " Tốc độ gió duy trì %.1f m/s vượt giới hạn chịu gió của khung thân (%.1f m/s).", windSpeedMs, windToleranceMs)
                    : String.format(Locale.ROOT, " Sustained wind speed of %.1f m/s exceeds airframe limit (%.1f m/s).", windSpeedMs, windToleranceMs));
        }
        if (payloadExceeded) {
            explanation.append(vi
                    ? String.format(Locale.ROOT, " Khối lượng tải trọng %.1f kg vượt tải trọng tối đa của Drone (%.1f kg).", payloadKg, maxPayloadKg)
                    : String.format(Locale.ROOT, " Payload weight %.1f kg exceeds max airframe payload (%.1f kg).", payloadKg, maxPayloadKg));
        }

        return new EnergyCalculationResultVm(
                verdict,
                marginPct,
                usableWh,
                requiredWh,
                cruiseWh,
                hoverWh,
                climbWh,
                payloadFactor,
                windFactor,
                confidence,
                windExceeded,
                solutions,
                explanation.toString(),
                "deterministic"
        );
    }
}

