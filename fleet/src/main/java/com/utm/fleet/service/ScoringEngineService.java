package com.utm.fleet.service;

import com.utm.commonlibrary.utils.LocaleUtils;
import com.utm.fleet.viewmodel.FleetDtos.AlternativeDroneVm;
import com.utm.fleet.viewmodel.FleetDtos.DroneClientVm;
import com.utm.fleet.viewmodel.FleetDtos.DroneScoreVm;
import com.utm.fleet.viewmodel.FleetDtos.HubClientVm;
import com.utm.fleet.viewmodel.FleetDtos.ScoringWeightsVm;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class ScoringEngineService {

    private static final double EARTH_RADIUS_M = 6371000.0;

    public record MissionRequirements(
            String departureHubId,
            Double departureLatitude,
            Double departureLongitude,
            Double estimatedDistanceM,
            Integer estimatedDurationSec,
            Double requiredPayloadKg,
            List<String> requiredCapabilities
    ) {
    }

    public record ScoredDrone(
            DroneClientVm drone,
            DroneScoreVm scores,
            double finalScore,
            boolean eligible,
            String ineligibilityReason
    ) {
    }

    public List<ScoredDrone> scoreDrones(
            List<DroneClientVm> drones,
            MissionRequirements requirements,
            ScoringWeightsVm weights,
            Map<String, HubClientVm> hubMap,
            Map<String, Double> batteryOverrides,
            double fleetAverageFlightHours) {
        double effectiveAvgHours = fleetAverageFlightHours > 0 ? fleetAverageFlightHours : 150.0;
        return drones.stream()
                .map(d -> scoreDrone(d, requirements, weights, hubMap, batteryOverrides.get(d.id()), effectiveAvgHours))
                .sorted(Comparator.comparingDouble(ScoredDrone::finalScore).reversed())
                .toList();
    }

    public ScoredDrone scoreDrone(
            DroneClientVm drone,
            MissionRequirements requirements,
            ScoringWeightsVm weights,
            Map<String, HubClientVm> hubMap,
            Double liveBatteryPct,
            double fleetAverageFlightHours) {
        String ineligibility = checkIneligibilityReason(drone, requirements);
        if (ineligibility != null) {
            return new ScoredDrone(
                    drone,
                    new DroneScoreVm(0, 0, 0, 0, 0),
                    0.0,
                    false,
                    ineligibility);
        }

        double proximity = calculateProximityScore(drone, requirements, hubMap);
        double battery = calculateBatteryScore(drone, requirements, liveBatteryPct);
        double capability = calculateCapabilityScore(drone, requirements);
        double utilization = calculateUtilizationScore(drone, fleetAverageFlightHours);
        double maintenance = calculateMaintenanceScore(drone);

        DroneScoreVm scores = new DroneScoreVm(proximity, battery, capability, utilization, maintenance);
        ScoringWeightsVm w = weights != null ? weights : ScoringWeightsVm.balancedDefault();
        double finalScore = round2(
                proximity * w.proximity()
                        + battery * w.battery()
                        + capability * w.capability()
                        + utilization * w.utilization()
                        + maintenance * w.maintenance());

        if (battery <= 0 || capability <= 0) {
            boolean vi = LocaleUtils.isVietnamese();
            String reason;
            if (battery <= 0) {
                reason = vi
                        ? "Mức pin không đủ cho ngưỡng dự phòng nhiệm vụ"
                        : "Insufficient battery level for mission reserve";
            } else {
                reason = vi
                        ? "Thiếu năng lực thiết bị bắt buộc của Drone"
                        : "Missing required drone capabilities";
            }
            return new ScoredDrone(drone, scores, 0.0, false, reason);
        }
        return new ScoredDrone(drone, scores, finalScore, true, null);
    }

    public List<AlternativeDroneVm> formatAlternatives(List<ScoredDrone> scored, int topN) {
        return scored.stream()
                .limit(Math.max(0, topN))
                .map(sd -> new AlternativeDroneVm(
                        sd.drone().id(),
                        sd.drone().registrationNumber(),
                        sd.finalScore(),
                        sd.scores(),
                        sd.ineligibilityReason()))
                .toList();
    }

    private String checkIneligibilityReason(DroneClientVm drone, MissionRequirements req) {
        boolean vi = LocaleUtils.isVietnamese();
        String status = drone.status() != null ? drone.status().toLowerCase(Locale.ROOT) : "";
        if (!"available".equals(status) && !"standby".equals(status)) {
            return vi ? "Trạng thái Drone hiện là " + drone.status() : "Drone status is " + drone.status();
        }
        String hubId = effectiveHubId(drone);
        if (hubId == null || hubId.isBlank()) {
            return vi ? "Drone hiện không đỗ tại Hub nào" : "Drone is not stationed at a hub";
        }
        if (req.requiredPayloadKg() != null && req.requiredPayloadKg() > 0) {
            double maxPayload = drone.maxPayloadKg() != null ? drone.maxPayloadKg() : 0.0;
            if (maxPayload < req.requiredPayloadKg()) {
                return vi
                        ? String.format(Locale.US, "Tải trọng tối đa không đủ (%.2fkg < %.2fkg)", maxPayload, req.requiredPayloadKg())
                        : String.format("Insufficient payload capacity (%.2fkg < %.2fkg)", maxPayload, req.requiredPayloadKg());
            }
        }
        if (req.estimatedDistanceM() != null && req.estimatedDistanceM() > 0 && drone.maxRangeM() != null && drone.maxRangeM() > 0) {
            if (drone.maxRangeM() < req.estimatedDistanceM()) {
                return vi
                        ? String.format(Locale.US, "Tầm bay tối đa không đủ (%.0fm < %.0fm)", drone.maxRangeM(), req.estimatedDistanceM())
                        : String.format("Insufficient range (%.0fm < %.0fm)", drone.maxRangeM(), req.estimatedDistanceM());
            }
        }
        return null;
    }

    private double calculateProximityScore(
            DroneClientVm drone, MissionRequirements req, Map<String, HubClientVm> hubMap) {
        String droneHubId = effectiveHubId(drone);
        if (droneHubId != null && droneHubId.equals(req.departureHubId())) {
            return 100.0;
        }
        HubClientVm currentHub = droneHubId != null && hubMap != null ? hubMap.get(droneHubId) : null;
        if (currentHub == null || currentHub.latitude() == null || currentHub.longitude() == null
                || req.departureLatitude() == null || req.departureLongitude() == null) {
            return 50.0;
        }
        double distM = haversineMeters(
                currentHub.latitude(), currentHub.longitude(),
                req.departureLatitude(), req.departureLongitude());
        double maxRange = drone.maxRangeM() != null && drone.maxRangeM() > 0 ? drone.maxRangeM() : 50000.0;
        return Math.round(Math.max(0.0, 100.0 - (distM / maxRange) * 100.0));
    }

    private double calculateBatteryScore(DroneClientVm drone, MissionRequirements req, Double liveBatteryPct) {
        double estimatedMin = ((req.estimatedDurationSec() != null && req.estimatedDurationSec() > 0)
                ? req.estimatedDurationSec()
                : 1800) / 60.0;
        double requiredBattery = Math.min(80.0, estimatedMin + 20.0);

        double currentBattery = liveBatteryPct != null
                ? liveBatteryPct
                : (drone.batteryHealthPct() != null ? Math.min(100.0, Math.max(75.0, drone.batteryHealthPct())) : 90.0);

        if (currentBattery < requiredBattery) {
            return 0.0;
        }
        double maxExcess = Math.max(1.0, 100.0 - requiredBattery);
        return Math.round(Math.min(100.0, ((currentBattery - requiredBattery) / maxExcess) * 100.0));
    }

    private double calculateCapabilityScore(DroneClientVm drone, MissionRequirements req) {
        double score = 100.0;
        if (req.requiredPayloadKg() != null && req.requiredPayloadKg() > 0 && drone.maxPayloadKg() != null) {
            double ratio = drone.maxPayloadKg() / req.requiredPayloadKg();
            if (ratio < 1.0) {
                return 0.0;
            }
            if (ratio > 2.0) {
                score -= 10.0;
            }
        }
        if (req.requiredCapabilities() != null && !req.requiredCapabilities().isEmpty()) {
            Set<String> have = new HashSet<>();
            if (drone.capabilities() != null) {
                for (String c : drone.capabilities()) {
                    if (c != null) {
                        have.add(c.trim().toLowerCase(Locale.ROOT));
                    }
                }
            }
            long matched = req.requiredCapabilities().stream()
                    .filter(c -> c != null && have.contains(c.trim().toLowerCase(Locale.ROOT)))
                    .count();
            score *= ((double) matched / req.requiredCapabilities().size());
        }
        return Math.round(score);
    }

    private double calculateUtilizationScore(DroneClientVm drone, double fleetAvgHours) {
        double hours = drone.totalFlightHours() != null ? drone.totalFlightHours() : 0.0;
        double ratio = hours / Math.max(1.0, fleetAvgHours);
        if (ratio <= 0.5) {
            return 100.0;
        }
        if (ratio >= 1.5) {
            return 0.0;
        }
        return Math.round(Math.max(0.0, Math.min(100.0, 100.0 - ((ratio - 0.5) * 100.0))));
    }

    private double calculateMaintenanceScore(DroneClientVm drone) {
        if (drone.nextMaintenance() == null) {
            double health = drone.batteryHealthPct() != null ? drone.batteryHealthPct() : 90.0;
            return health >= 85.0 ? 85.0 : Math.max(40.0, Math.round(health));
        }
        long daysUntil = Duration.between(ZonedDateTime.now(), drone.nextMaintenance()).toDays();
        if (daysUntil < 0) {
            return 0.0;
        }
        if (daysUntil < 3) {
            return 20.0;
        }
        if (daysUntil < 7) {
            return 50.0;
        }
        if (daysUntil < 14) {
            return 70.0;
        }
        if (daysUntil < 30) {
            return 90.0;
        }
        return 100.0;
    }

    private String effectiveHubId(DroneClientVm drone) {
        if (drone.currentHubId() != null && !drone.currentHubId().isBlank()) {
            return drone.currentHubId();
        }
        return drone.homeHubId();
    }

    private double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0);
        return EARTH_RADIUS_M * 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
    }

    private double round2(double val) {
        return Math.round(val * 100.0) / 100.0;
    }
}
