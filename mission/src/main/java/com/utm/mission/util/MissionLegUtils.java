package com.utm.mission.util;

import com.utm.mission.model.Mission;
import com.utm.mission.model.Waypoint;
import com.utm.mission.model.enumeration.StopoverType;
import com.utm.mission.model.enumeration.WaypointType;
import com.utm.mission.viewmodel.client.DroneBriefVm;
import com.utm.mission.viewmodel.client.HubBriefVm;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class MissionLegUtils {

    public static final double HUB_ANCHOR_THRESHOLD_M = 30.0;
    public static final double DEFAULT_CRUISE_POWER_W = 200.0;
    public static final double DEFAULT_HOVER_POWER_W = 250.0;
    public static final double DEFAULT_CRUISE_SPEED_MS = 12.0;
    public static final double DEFAULT_CLIMB_SPEED_MS = 3.0;
    public static final double DEFAULT_CRUISING_ALTITUDE_AGL = 50.0;
    public static final double DEFAULT_MAX_PAYLOAD_KG = 5.0;
    public static final double DEFAULT_BATTERY_CAPACITY_WH = 500.0;
    public static final double RESERVE_FRACTION = 0.20;
    public static final double K_PAYLOAD = 0.50;
    public static final double CLIMB_SURCHARGE = 0.15;
    public static final long MIN_LEG_DURATION_SECONDS = 60L;

    private MissionLegUtils() {
    }

    public record PlannedLegSpec(
            int legIndex,
            String departureHubId,
            String arrivalHubId,
            StopoverType stopoverType,
            int groundTimeMinutes,
            double payloadWeightKg,
            double distanceMeters,
            double totalHoverSeconds,
            double estimatedEnergyWh,
            List<Waypoint> waypoints
    ) {
    }

    public record BatteryCycleSegment(
            int segmentIndex,
            int startLegIndex,
            int endLegIndex,
            boolean usesInitialBattery,
            double cumulativeEnergyWh,
            List<Integer> legIndices
    ) {
    }

    public static boolean isHubWaypoint(Waypoint wp) {
        if (wp == null) {
            return false;
        }
        boolean hasHub = wp.getHubId() != null && !wp.getHubId().isBlank();
        if (!hasHub) {
            return false;
        }
        if (wp.getWaypointType() == WaypointType.HUB) {
            return true;
        }
        return wp.getStopoverType() != null && wp.getStopoverType() != StopoverType.NONE;
    }

    public static boolean isHubStopoverWaypoint(Waypoint wp) {
        return isHubWaypoint(wp)
                && wp.getStopoverType() != null
                && wp.getStopoverType() != StopoverType.NONE;
    }

    public static List<PlannedLegSpec> decomposeIntoLegs(
            Mission mission,
            List<Waypoint> waypoints,
            Map<String, HubBriefVm> hubMap
    ) {
        if (waypoints == null || waypoints.isEmpty()) {
            return List.of();
        }

        List<PlannedLegSpec> legs = new ArrayList<>();
        String currentDepHubId = mission.getDepartureHubId();
        double currentPayloadKg = mission.getPayloadWeightKg() != null ? Math.max(0.0, mission.getPayloadWeightKg()) : 0.0;
        List<Waypoint> currentLegWaypoints = new ArrayList<>();

        for (int i = 0; i < waypoints.size(); i++) {
            Waypoint wp = waypoints.get(i);
            currentLegWaypoints.add(wp);

            boolean isLast = i == waypoints.size() - 1;
            boolean isHubStopover = isHubStopoverWaypoint(wp);

            boolean isDuplicateDepartureAnchor = i == 0
                    && wp.getHubId() != null && wp.getHubId().equals(currentDepHubId);
            boolean isTerminalArrivalAnchor = isLast
                    && wp.getHubId() != null && wp.getHubId().equals(mission.getArrivalHubId());

            if (isHubStopover && !isDuplicateDepartureAnchor && !isTerminalArrivalAnchor) {
                String stopHubId = wp.getHubId().trim();
                StopoverType stopType = (wp.getStopoverType() != null && wp.getStopoverType() != StopoverType.NONE)
                        ? wp.getStopoverType()
                        : StopoverType.RECHARGE;
                int groundMinutes = wp.getGroundTimeMinutes() != null
                        ? Math.max(0, wp.getGroundTimeMinutes())
                        : stopType.getDefaultGroundTimeMinutes();

                legs.add(buildLegSpec(
                        legs.size(),
                        currentDepHubId,
                        stopHubId,
                        stopType,
                        groundMinutes,
                        currentPayloadKg,
                        currentLegWaypoints,
                        hubMap));

                double delta = wp.getPayloadDeltaKg() != null ? wp.getPayloadDeltaKg() : 0.0;
                currentPayloadKg = Math.max(0.0, currentPayloadKg + delta);
                currentDepHubId = stopHubId;
                currentLegWaypoints = new ArrayList<>();
                currentLegWaypoints.add(wp);
            }
        }

        if (!currentLegWaypoints.isEmpty()) {
            boolean alreadyLandedAtArrival = currentLegWaypoints.size() == 1
                    && !legs.isEmpty()
                    && currentDepHubId != null
                    && currentDepHubId.equals(mission.getArrivalHubId())
                    && currentLegWaypoints.getFirst().getHubId() != null
                    && currentLegWaypoints.getFirst().getHubId().equals(mission.getArrivalHubId());
            if (!alreadyLandedAtArrival) {
                legs.add(buildLegSpec(
                        legs.size(),
                        currentDepHubId,
                        mission.getArrivalHubId(),
                        StopoverType.NONE,
                        0,
                        currentPayloadKg,
                        currentLegWaypoints,
                        hubMap));
            }
        }

        return legs;
    }

    public static double calculateAnchoredDistance(
            List<Waypoint> waypoints,
            HubBriefVm depHub,
            HubBriefVm arrHub
    ) {
        if (waypoints == null || waypoints.isEmpty()) {
            return 0.0;
        }
        List<double[]> points = buildAnchoredCoordinates(waypoints, depHub, arrHub);
        double total = 0.0;
        for (int i = 0; i < points.size() - 1; i++) {
            total += GeoUtils.haversine(points.get(i)[0], points.get(i)[1], points.get(i + 1)[0], points.get(i + 1)[1]);
        }
        return Math.round(total * 100.0) / 100.0;
    }

    /**
     * Builds 3D AGL coordinates with vertical climb at departure hub and vertical descent at arrival hub
     * so flight trajectories never slice diagonally below airspace corridor floors.
     */
    public static List<double[]> buildAnchoredCoordinates(
            List<Waypoint> waypoints,
            HubBriefVm depHub,
            HubBriefVm arrHub
    ) {
        List<double[]> rawWaypoints = new ArrayList<>();
        Double firstAirAlt = null;
        Double lastAirAlt = null;

        if (waypoints != null) {
            for (Waypoint wp : waypoints) {
                if (wp.getLatitude() != null && wp.getLongitude() != null) {
                    double alt = wp.getAltitude() != null ? Math.max(0.0, wp.getAltitude()) : DEFAULT_CRUISING_ALTITUDE_AGL;
                    if (alt > 0.0) {
                        if (firstAirAlt == null) {
                            firstAirAlt = alt;
                        }
                        lastAirAlt = alt;
                    }
                    rawWaypoints.add(new double[] { wp.getLatitude(), wp.getLongitude(), alt });
                }
            }
        }

        double departureCruiseAlt = firstAirAlt != null ? firstAirAlt : DEFAULT_CRUISING_ALTITUDE_AGL;
        double arrivalCruiseAlt = lastAirAlt != null ? lastAirAlt : departureCruiseAlt;

        List<double[]> points = new ArrayList<>();

        if (depHub != null && depHub.latitude() != null && depHub.longitude() != null) {
            points.add(new double[] { depHub.latitude(), depHub.longitude(), 0.0 });
            points.add(new double[] { depHub.latitude(), depHub.longitude(), departureCruiseAlt });
        }

        for (int i = 0; i < rawWaypoints.size(); i++) {
            double[] pt = rawWaypoints.get(i);
            boolean isNearDep = depHub != null && depHub.latitude() != null && depHub.longitude() != null
                    && GeoUtils.haversine(depHub.latitude(), depHub.longitude(), pt[0], pt[1]) <= HUB_ANCHOR_THRESHOLD_M;
            boolean isNearArr = arrHub != null && arrHub.latitude() != null && arrHub.longitude() != null
                    && GeoUtils.haversine(arrHub.latitude(), arrHub.longitude(), pt[0], pt[1]) <= HUB_ANCHOR_THRESHOLD_M;

            if (i == 0 && isNearDep && pt[2] <= 0.0) {
                continue;
            }
            if (i == rawWaypoints.size() - 1 && isNearArr && pt[2] <= 0.0) {
                continue;
            }
            if (pt[2] <= 0.0) {
                double transitionAlt = !points.isEmpty() && points.getLast()[2] > 0.0
                        ? points.getLast()[2]
                        : departureCruiseAlt;
                points.add(new double[] { pt[0], pt[1], transitionAlt });
                points.add(new double[] { pt[0], pt[1], 0.0 });
                if (i < rawWaypoints.size() - 1) {
                    double nextAlt = rawWaypoints.get(i + 1)[2] > 0.0 ? rawWaypoints.get(i + 1)[2] : arrivalCruiseAlt;
                    points.add(new double[] { pt[0], pt[1], nextAlt });
                }
            } else {
                points.add(pt);
            }
        }

        if (arrHub != null && arrHub.latitude() != null && arrHub.longitude() != null) {
            if (points.isEmpty() || points.getLast()[2] > 0.0
                    || GeoUtils.haversine(arrHub.latitude(), arrHub.longitude(),
                            points.getLast()[0], points.getLast()[1]) > HUB_ANCHOR_THRESHOLD_M) {
                points.add(new double[] { arrHub.latitude(), arrHub.longitude(), arrivalCruiseAlt });
                points.add(new double[] { arrHub.latitude(), arrHub.longitude(), 0.0 });
            }
        }

        return points;
    }

    public static double usableBatteryWh(DroneBriefVm drone, double batteryPct) {
        double capacityWh = drone != null && drone.batteryCapacityWh() != null && drone.batteryCapacityWh() > 0
                ? drone.batteryCapacityWh()
                : DEFAULT_BATTERY_CAPACITY_WH;
        double healthPct = drone != null && drone.batteryHealthPct() != null
                ? Math.max(10.0, Math.min(100.0, drone.batteryHealthPct()))
                : 100.0;
        double safeBatteryPct = Math.max(0.0, Math.min(100.0, batteryPct));
        return capacityWh * (safeBatteryPct / 100.0) * (healthPct / 100.0) * (1.0 - RESERVE_FRACTION);
    }

    public static double effectiveBatteryCapacityWh(DroneBriefVm drone) {
        double capacityWh = drone != null && drone.batteryCapacityWh() != null && drone.batteryCapacityWh() > 0
                ? drone.batteryCapacityWh()
                : DEFAULT_BATTERY_CAPACITY_WH;
        double healthPct = drone != null && drone.batteryHealthPct() != null
                ? Math.max(10.0, Math.min(100.0, drone.batteryHealthPct()))
                : 100.0;
        return capacityWh * (healthPct / 100.0);
    }

    public static double estimateEnergyWh(
            double distanceMeters,
            double hoverSeconds,
            double payloadKg,
            DroneBriefVm drone
    ) {
        return estimateEnergyWh(distanceMeters, hoverSeconds, payloadKg, drone, 1.0);
    }

    public static double estimateEnergyWh(
            double distanceMeters,
            double hoverSeconds,
            double payloadKg,
            DroneBriefVm drone,
            double windFactor
    ) {
        double cruisePowerW = drone != null && drone.cruisePowerW() != null && drone.cruisePowerW() > 0
                ? drone.cruisePowerW()
                : DEFAULT_CRUISE_POWER_W;
        double hoverPowerW = drone != null && drone.hoverPowerW() != null && drone.hoverPowerW() > 0
                ? drone.hoverPowerW()
                : DEFAULT_HOVER_POWER_W;
        double cruiseSpeedMs = drone != null && drone.cruiseSpeedMs() != null && drone.cruiseSpeedMs() > 0
                ? drone.cruiseSpeedMs()
                : DEFAULT_CRUISE_SPEED_MS;
        double maxPayloadKg = drone != null && drone.maxPayload() != null && drone.maxPayload() > 0
                ? drone.maxPayload()
                : DEFAULT_MAX_PAYLOAD_KG;

        double safeDistance = Math.max(0.0, distanceMeters);
        double safeHover = Math.max(0.0, hoverSeconds);
        double safePayload = Math.max(0.0, payloadKg);
        double safeWind = Math.max(1.0, windFactor);

        double payloadFactor = 1.0 + K_PAYLOAD * (safePayload / maxPayloadKg);
        double cruiseHours = (safeDistance / cruiseSpeedMs) / 3600.0;
        double cruiseWh = cruisePowerW * cruiseHours * payloadFactor * safeWind;
        double hoverWh = hoverPowerW * (safeHover / 3600.0) * payloadFactor * Math.sqrt(safeWind);
        double climbWh = (cruiseWh + hoverWh) * CLIMB_SURCHARGE;

        return Math.round((cruiseWh + hoverWh + climbWh) * 10.0) / 10.0;
    }

    public static List<BatteryCycleSegment> calculateCumulativeBatterySegments(
            List<PlannedLegSpec> legs,
            DroneBriefVm drone,
            double windFactor
    ) {
        if (legs == null || legs.isEmpty()) {
            return List.of();
        }
        List<BatteryCycleSegment> segments = new ArrayList<>();
        int startLegIdx = 0;
        double cumulativeWh = 0.0;
        List<Integer> legIndices = new ArrayList<>();

        for (int i = 0; i < legs.size(); i++) {
            PlannedLegSpec leg = legs.get(i);
            double legWh = estimateEnergyWh(leg.distanceMeters(), leg.totalHoverSeconds(), leg.payloadWeightKg(), drone, windFactor);
            cumulativeWh += legWh;
            legIndices.add(leg.legIndex());

            boolean resetsAfterLeg = leg.stopoverType() != null && leg.stopoverType().resetsBattery();
            boolean isLastLeg = i == legs.size() - 1;
            if (resetsAfterLeg || isLastLeg) {
                segments.add(new BatteryCycleSegment(
                        segments.size(),
                        startLegIdx,
                        leg.legIndex(),
                        segments.isEmpty(),
                        Math.round(cumulativeWh * 10.0) / 10.0,
                        List.copyOf(legIndices)));
                cumulativeWh = 0.0;
                legIndices.clear();
                if (!isLastLeg) {
                    startLegIdx = legs.get(i + 1).legIndex();
                }
            }
        }
        return segments;
    }

    public static Map<Integer, Double> computeExpectedInitialBatteryPcts(
            List<PlannedLegSpec> legs,
            DroneBriefVm drone,
            double windFactor
    ) {
        Map<Integer, Double> result = new HashMap<>();
        if (legs == null || legs.isEmpty()) {
            return result;
        }
        double effectiveCapWh = Math.max(1.0, effectiveBatteryCapacityWh(drone));
        double currentSocPct = drone != null && drone.currentBatteryPct() != null
                ? Math.max(0.0, Math.min(100.0, drone.currentBatteryPct()))
                : 100.0;

        for (int i = 0; i < legs.size(); i++) {
            PlannedLegSpec leg = legs.get(i);
            result.put(leg.legIndex(), Math.round(currentSocPct * 10.0) / 10.0);

            double legWh = estimateEnergyWh(leg.distanceMeters(), leg.totalHoverSeconds(), leg.payloadWeightKg(), drone, windFactor);
            double consumedPct = (legWh / effectiveCapWh) * 100.0;
            if (leg.stopoverType() != null && leg.stopoverType().resetsBattery()) {
                currentSocPct = 100.0;
            } else {
                currentSocPct = Math.max(0.0, currentSocPct - consumedPct);
            }
        }
        return result;
    }

    public static long computeLegDurationSeconds(
            PlannedLegSpec leg,
            DroneBriefVm drone,
            Map<String, HubBriefVm> hubMap
    ) {
        if (leg == null) {
            return MIN_LEG_DURATION_SECONDS;
        }
        double defaultSpeed = drone != null && drone.cruiseSpeedMs() != null && drone.cruiseSpeedMs() > 0
                ? drone.cruiseSpeedMs()
                : DEFAULT_CRUISE_SPEED_MS;

        HubBriefVm depHub = hubMap != null && leg.departureHubId() != null ? hubMap.get(leg.departureHubId()) : null;
        HubBriefVm arrHub = hubMap != null && leg.arrivalHubId() != null ? hubMap.get(leg.arrivalHubId()) : null;

        List<Waypoint> wps = leg.waypoints();
        if (wps == null || wps.isEmpty()) {
            double travelSec = leg.distanceMeters() / defaultSpeed;
            return Math.max(MIN_LEG_DURATION_SECONDS, Math.round(travelSec + leg.totalHoverSeconds()));
        }

        double totalSeconds = 0.0;
        double prevLat = depHub != null && depHub.latitude() != null ? depHub.latitude() : wps.getFirst().getLatitude();
        double prevLon = depHub != null && depHub.longitude() != null ? depHub.longitude() : wps.getFirst().getLongitude();
        double prevAlt = 0.0;

        for (Waypoint wp : wps) {
            if (wp.getLatitude() == null || wp.getLongitude() == null) {
                continue;
            }
            double targetAlt = wp.getAltitude() != null ? Math.max(0.0, wp.getAltitude()) : DEFAULT_CRUISING_ALTITUDE_AGL;
            double segDist = GeoUtils.haversine(prevLat, prevLon, wp.getLatitude(), wp.getLongitude());
            double segSpeed = wp.getSpeedToWaypoint() != null && wp.getSpeedToWaypoint() > 0
                    ? wp.getSpeedToWaypoint()
                    : defaultSpeed;
            totalSeconds += (segDist / segSpeed);
            totalSeconds += Math.abs(targetAlt - prevAlt) / DEFAULT_CLIMB_SPEED_MS;

            prevLat = wp.getLatitude();
            prevLon = wp.getLongitude();
            prevAlt = targetAlt;
        }

        if (arrHub != null && arrHub.latitude() != null && arrHub.longitude() != null) {
            double finalDist = GeoUtils.haversine(prevLat, prevLon, arrHub.latitude(), arrHub.longitude());
            totalSeconds += (finalDist / defaultSpeed);
            totalSeconds += Math.abs(prevAlt) / DEFAULT_CLIMB_SPEED_MS;
        } else if (prevAlt > 0.0) {
            totalSeconds += prevAlt / DEFAULT_CLIMB_SPEED_MS;
        }

        totalSeconds += leg.totalHoverSeconds();
        return Math.max(MIN_LEG_DURATION_SECONDS, Math.round(totalSeconds));
    }

    public static List<HubBriefVm> findRecommendedChargingHubs(
            HubBriefVm depHub,
            HubBriefVm arrHub,
            double payloadKg,
            double usableWh,
            List<HubBriefVm> activeHubs
    ) {
        if (depHub == null || arrHub == null || depHub.latitude() == null || depHub.longitude() == null
                || arrHub.latitude() == null || arrHub.longitude() == null || activeHubs == null || activeHubs.isEmpty()) {
            return List.of();
        }

        record CandidateHub(HubBriefVm hub, double totalDetourMeters) {
        }

        List<CandidateHub> candidates = new ArrayList<>();
        for (HubBriefVm mid : activeHubs) {
            if (mid == null || mid.id() == null || mid.latitude() == null || mid.longitude() == null || !mid.isActive()) {
                continue;
            }
            if (mid.id().equals(depHub.id()) || mid.id().equals(arrHub.id())) {
                continue;
            }
            double dist1 = GeoUtils.haversine(depHub.latitude(), depHub.longitude(), mid.latitude(), mid.longitude());
            double dist2 = GeoUtils.haversine(mid.latitude(), mid.longitude(), arrHub.latitude(), arrHub.longitude());
            double wh1 = estimateEnergyWh(dist1, 30.0, payloadKg, null);
            double wh2 = estimateEnergyWh(dist2, 30.0, payloadKg, null);
            if (wh1 <= usableWh && wh2 <= usableWh) {
                candidates.add(new CandidateHub(mid, dist1 + dist2));
            }
        }

        return candidates.stream()
                .sorted(Comparator.comparingDouble(CandidateHub::totalDetourMeters))
                .limit(3)
                .map(CandidateHub::hub)
                .toList();
    }

    public static double extractTotalHoverSeconds(List<Waypoint> waypoints) {
        if (waypoints == null || waypoints.isEmpty()) {
            return 0.0;
        }
        double total = 0.0;
        for (Waypoint wp : waypoints) {
            total += extractWaypointHoverSeconds(wp);
        }
        return total;
    }

    public static double extractWaypointHoverSeconds(Waypoint wp) {
        if (wp == null) {
            return 0.0;
        }
        if (wp.getHoverDurationSec() != null && wp.getHoverDurationSec() > 0) {
            return wp.getHoverDurationSec();
        }
        if (wp.getActions() != null) {
            Object raw = wp.getActions().get("durationS");
            if (raw == null) {
                raw = wp.getActions().get("hoverDurationSec");
            }
            if (raw instanceof Number n && n.doubleValue() > 0) {
                return n.doubleValue();
            }
        }
        return 0.0;
    }

    static PlannedLegSpec buildLegSpec(
            int legIndex,
            String depHubId,
            String arrHubId,
            StopoverType stopoverType,
            int groundMinutes,
            double payloadKg,
            List<Waypoint> legWaypoints,
            Map<String, HubBriefVm> hubMap
    ) {
        HubBriefVm depHub = hubMap != null && depHubId != null ? hubMap.get(depHubId) : null;
        HubBriefVm arrHub = hubMap != null && arrHubId != null ? hubMap.get(arrHubId) : null;
        double distanceMeters = calculateAnchoredDistance(legWaypoints, depHub, arrHub);
        double hoverSeconds = extractTotalHoverSeconds(legWaypoints);
        double estimatedEnergyWh = estimateEnergyWh(distanceMeters, hoverSeconds, payloadKg, null);

        return new PlannedLegSpec(
                legIndex,
                depHubId,
                arrHubId,
                stopoverType,
                groundMinutes,
                payloadKg,
                distanceMeters,
                hoverSeconds,
                estimatedEnergyWh,
                List.copyOf(legWaypoints));
    }
}
