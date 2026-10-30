package com.utm.flight.service;

import com.utm.flight.config.FeasibilityConfig;
import com.utm.flight.model.enumeration.SolutionKind;
import com.utm.flight.model.enumeration.Verdict;
import com.utm.flight.viewmodel.DroneEnergySpecVm;
import com.utm.flight.viewmodel.EnergyCalculationResultVm;
import com.utm.flight.viewmodel.EnvConditionsVm;
import com.utm.flight.viewmodel.FeasibilitySolutionVm;
import com.utm.flight.viewmodel.MissionProfileVm;
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

        double usableWh = batteryCapacityWh * (batteryHealthPct / 100.0) * (1.0 - FeasibilityConfig.RESERVE_FRACTION);

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

        String confidence = "HIGH";
        if (droneSpec == null || droneSpec.batteryCapacityWh() == null) {
            confidence = "LOW";
        } else if (windSpeedMs == null) {
            confidence = "MEDIUM";
        }

        List<FeasibilitySolutionVm> solutions = new ArrayList<>();
        if (verdict != Verdict.GO) {
            if (payloadKg > 0) {
                solutions.add(new FeasibilitySolutionVm(
                        SolutionKind.REDUCE_PAYLOAD,
                        "Reduce Payload",
                        String.format(Locale.ROOT, "Reduce payload from %.1f kg to below %.1f kg to meet energy margin threshold",
                                payloadKg, Math.max(0.0, payloadKg * 0.7))
                ));
            }
            if (distanceM > 3000.0) {
                solutions.add(new FeasibilitySolutionVm(
                        SolutionKind.CHARGING_STOP,
                        "Plan Intermediate Charging Stop",
                        "Insert an intermediate vertiport waypoint for mid-mission battery recharging"
                ));
            }
            solutions.add(new FeasibilitySolutionVm(
                    SolutionKind.OTHER_DRONE,
                    "Assign Higher-Capacity Drone",
                    "Switch to an airframe model with larger battery capacity or greater wind tolerance"
            ));
            if (windSpeedMs != null && windSpeedMs > (windToleranceMs * 0.7)) {
                solutions.add(new FeasibilitySolutionVm(
                        SolutionKind.AWAIT_WIND,
                        "Await Favorable Wind Conditions",
                        String.format(Locale.ROOT, "Postpone mission until sustained wind drops below %.1f m/s (currently %.1f m/s)",
                                windToleranceMs * 0.7, windSpeedMs)
                ));
            }
        }

        StringBuilder explanation = new StringBuilder(String.format(Locale.ROOT,
                "Usable battery: %.1f Wh (reserve 20%%), Required: %.1f Wh (cruise: %.1f Wh, hover: %.1f Wh, climb: %.1f Wh). Net margin: %.1f%%. Verdict: %s.",
                usableWh, requiredWh, cruiseWh, hoverWh, climbWh, marginPct, verdict.name()
        ));

        if (windExceeded) {
            explanation.append(String.format(Locale.ROOT, " Sustained wind speed of %.1f m/s exceeds airframe limit (%.1f m/s).", windSpeedMs, windToleranceMs));
        }
        if (payloadExceeded) {
            explanation.append(String.format(Locale.ROOT, " Payload weight %.1f kg exceeds max airframe payload (%.1f kg).", payloadKg, maxPayloadKg));
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
