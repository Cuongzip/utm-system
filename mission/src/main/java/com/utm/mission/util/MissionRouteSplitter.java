package com.utm.mission.util;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.mission.model.Mission;
import com.utm.mission.model.Waypoint;
import com.utm.mission.model.enumeration.StopoverType;
import com.utm.mission.model.enumeration.WaypointType;
import com.utm.mission.viewmodel.client.DroneBriefVm;
import com.utm.mission.viewmodel.client.HubBriefVm;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

/**
 * Unified energy-budget multi-leg route planner and flight splitter.
 * Supports:
 * 1) Multi-hop Dijkstra shortest-path bridging over active Hubs when a transit segment exceeds single-charge range.
 * 2) Cumulative energy tracking for dense multi-point survey/patrol missions that diverts to the nearest reachable
 *    active Hub before reserve depletion and resumes from that Hub to the next airborne coordinate.
 */
public final class MissionRouteSplitter {

    private static final double HOP_OVERHEAD_WH = 5.0;
    private static final double TAKEOFF_LANDING_OVERHEAD_SEC = 30.0;

    private MissionRouteSplitter() {
    }

    public record RoutePlanResult(
            List<Waypoint> plannedWaypoints,
            int insertedHubCount,
            Map<String, HubBriefVm> enrichedHubMap,
            List<String> notes
    ) {
    }

    public static RoutePlanResult planWaypointsWithHubs(
            Mission mission,
            List<Waypoint> originalWaypoints,
            Map<String, HubBriefVm> existingHubMap,
            List<HubBriefVm> activeHubs,
            DroneBriefVm referenceDrone,
            StopoverType requestedStopoverType,
            double windFactor
    ) {
        Map<String, HubBriefVm> hubMap = new LinkedHashMap<>();
        if (existingHubMap != null) {
            hubMap.putAll(existingHubMap);
        }

        List<HubBriefVm> networkHubs = collectActiveNetworkHubs(activeHubs, existingHubMap);
        for (HubBriefVm hub : networkHubs) {
            hubMap.putIfAbsent(hub.id(), hub);
        }

        if (originalWaypoints == null || originalWaypoints.isEmpty()) {
            return new RoutePlanResult(List.of(), 0, hubMap, List.of());
        }

        StopoverType stopoverType = (requestedStopoverType != null && requestedStopoverType.resetsBattery())
                ? requestedStopoverType
                : StopoverType.RECHARGE;
        double safeWind = Math.max(1.0, windFactor);
        double usableFullWh = MissionLegUtils.usableBatteryWh(referenceDrone, 100.0);

        HubBriefVm depHub = hubMap.get(mission.getDepartureHubId());
        HubBriefVm arrHub = hubMap.get(mission.getArrivalHubId());
        if (depHub == null || depHub.latitude() == null || depHub.longitude() == null
                || arrHub == null || arrHub.latitude() == null || arrHub.longitude() == null) {
            return new RoutePlanResult(List.copyOf(originalWaypoints), 0, hubMap, List.of());
        }

        double currentPayloadKg = mission.getPayloadWeightKg() != null ? Math.max(0.0, mission.getPayloadWeightKg()) : 0.0;
        List<Waypoint> workingWaypoints = originalWaypoints.stream().map(MissionRouteSplitter::copyWaypoint).toList();
        List<Waypoint> output = new ArrayList<>();
        List<String> notes = new ArrayList<>();
        int insertedHubCount = 0;

        // Track current state across runs separated by existing manual HUB waypoints
        double currentLat = depHub.latitude();
        double currentLon = depHub.longitude();
        String currentHubId = depHub.id();
        double energyUsedWh = 0.0;
        boolean hasAirborneInCurrentFlight = false;

        int i = 0;
        int guard = 0;
        int maxIterations = Math.max(32, (workingWaypoints.size() + networkHubs.size() + 4) * 6);
        while (i < workingWaypoints.size()) {
            if (++guard > maxIterations) {
                throw new BadRequestException(
                        MessageCode.MISSION_SEGMENT_EXCEEDS_HUB_NETWORK_RANGE,
                        "segment", "Route planning exceeded maximum hub-bridging hops");
            }
            Waypoint targetWp = workingWaypoints.get(i);
            boolean isManualHubStop = MissionLegUtils.isHubStopoverWaypoint(targetWp);
            boolean isTerminalDeparture = i == 0
                    && targetWp.getHubId() != null
                    && targetWp.getHubId().trim().equals(depHub.id())
                    && (targetWp.getStopoverType() == null || targetWp.getStopoverType() == StopoverType.NONE);
            boolean isTerminalArrival = i == workingWaypoints.size() - 1
                    && targetWp.getHubId() != null
                    && targetWp.getHubId().trim().equals(arrHub.id())
                    && (targetWp.getStopoverType() == null || targetWp.getStopoverType() == StopoverType.NONE);

            // Preserve terminal departure hub waypoint (or redundant manual stop at departure hub) at sequence 1
            if (isTerminalDeparture || (i == 0 && isManualHubStop && targetWp.getHubId().trim().equals(depHub.id()))) {
                output.add(targetWp);
                i++;
                continue;
            }

            if (targetWp.getLatitude() == null || targetWp.getLongitude() == null) {
                output.add(targetWp);
                i++;
                continue;
            }

            double targetLat = targetWp.getLatitude();
            double targetLon = targetWp.getLongitude();
            double hoverSec = MissionLegUtils.extractWaypointHoverSeconds(targetWp);
            double stepDist = GeoUtils.haversine(currentLat, currentLon, targetLat, targetLon);
            double stepWh = MissionLegUtils.estimateEnergyWh(
                    stepDist,
                    hoverSec + (hasAirborneInCurrentFlight ? 0.0 : TAKEOFF_LANDING_OVERHEAD_SEC),
                    currentPayloadKg,
                    referenceDrone,
                    safeWind);

            double requiredReserveAfterTargetWh;
            if (isManualHubStop || isTerminalArrival) {
                // Landing at a HUB waypoint (intermediate stopover or terminal arrival hub)
                requiredReserveAfterTargetWh = 0.0;
            } else {
                boolean isLastBeforeArrival = isLastCoordinateBeforeArrival(workingWaypoints, i, mission.getArrivalHubId());
                if (isLastBeforeArrival) {
                    double distToArr = GeoUtils.haversine(targetLat, targetLon, arrHub.latitude(), arrHub.longitude());
                    double whToArr = MissionLegUtils.estimateEnergyWh(distToArr, 0.0, currentPayloadKg, referenceDrone, safeWind);
                    HubBriefVm nearestToTarget = findNearestActiveHub(targetLat, targetLon, networkHubs);
                    double whToNearest = nearestToTarget != null
                            ? MissionLegUtils.estimateEnergyWh(
                                    GeoUtils.haversine(targetLat, targetLon, nearestToTarget.latitude(), nearestToTarget.longitude()),
                                    0.0, currentPayloadKg, referenceDrone, safeWind)
                            : whToArr;
                    requiredReserveAfterTargetWh = Math.min(whToArr, whToNearest);
                } else {
                    HubBriefVm nearestToTarget = findNearestActiveHub(targetLat, targetLon, networkHubs);
                    requiredReserveAfterTargetWh = nearestToTarget != null
                            ? MissionLegUtils.estimateEnergyWh(
                                    GeoUtils.haversine(targetLat, targetLon, nearestToTarget.latitude(), nearestToTarget.longitude()),
                                    0.0, currentPayloadKg, referenceDrone, safeWind)
                            : 0.0;
                }
            }

            if (energyUsedWh + stepWh + requiredReserveAfterTargetWh <= usableFullWh) {
                output.add(targetWp);
                energyUsedWh += stepWh;
                currentLat = targetLat;
                currentLon = targetLon;

                if (isTerminalArrival) {
                    currentHubId = targetWp.getHubId().trim();
                    energyUsedWh = 0.0;
                    hasAirborneInCurrentFlight = false;
                } else if (isManualHubStop) {
                    currentHubId = targetWp.getHubId().trim();
                    double delta = targetWp.getPayloadDeltaKg() != null ? targetWp.getPayloadDeltaKg() : 0.0;
                    currentPayloadKg = Math.max(0.0, currentPayloadKg + delta);
                    if (targetWp.getStopoverType() != null && targetWp.getStopoverType().resetsBattery()) {
                        energyUsedWh = 0.0;
                        hasAirborneInCurrentFlight = false;
                    }
                } else {
                    hasAirborneInCurrentFlight = true;
                }
                i++;
                continue;
            }

            // Budget exceeded!
            if (hasAirborneInCurrentFlight || energyUsedWh > 0.0) {
                // Case 2: We are mid-flight (or on uncharged payload stop) and cannot safely advance to targetWp.
                // Divert from current position to the best reachable active Hub, land/recharge, then retry targetWp.
                HubBriefVm divertHub = findBestReachableDiversionHub(
                        currentLat, currentLon, targetLat, targetLon,
                        energyUsedWh, usableFullWh, currentPayloadKg, referenceDrone, safeWind, networkHubs, currentHubId);

                if (divertHub == null) {
                    throw new BadRequestException(
                            MessageCode.MISSION_SEGMENT_EXCEEDS_HUB_NETWORK_RANGE,
                            "segment", String.format("WP#%d (%s)", i + 1, targetWp.getName() != null ? targetWp.getName() : "coordinate"));
                }

                // Avoid duplicating if we're already standing at this exact hub with a non-charging manual stop
                if (divertHub.id().equals(currentHubId) && !output.isEmpty() && MissionLegUtils.isHubStopoverWaypoint(output.getLast())) {
                    Waypoint lastHubWp = output.getLast();
                    lastHubWp.setStopoverType(stopoverType);
                    lastHubWp.setGroundTimeMinutes(stopoverType.getDefaultGroundTimeMinutes());
                    notes.add("Upgraded stopover at hub " + divertHub.name() + " to " + stopoverType.getValue()
                            + " to satisfy cumulative multi-leg battery budget");
                } else {
                    Waypoint hubWp = createAutoHubWaypoint(mission, divertHub, stopoverType);
                    output.add(hubWp);
                    hubMap.put(divertHub.id(), divertHub);
                    insertedHubCount++;
                    notes.add("Inserted " + stopoverType.getValue() + " stopover at hub " + divertHub.name()
                            + " before waypoint '" + (targetWp.getName() != null ? targetWp.getName() : "#" + (i + 1)) + "'");
                }

                currentHubId = divertHub.id();
                currentLat = divertHub.latitude();
                currentLon = divertHub.longitude();
                energyUsedWh = 0.0;
                hasAirborneInCurrentFlight = false;
                // Do NOT increment i; re-evaluate targetWp with fresh 100% battery from divertHub!
            } else {
                // Case 3: We are already at a Hub with 100% fresh battery, yet targetWp is beyond single-charge range.
                // Run multi-hop Dijkstra across active Hubs to bridge from (currentLat, currentLon) to targetWp.
                String targetHubId = (isManualHubStop || isTerminalArrival) ? targetWp.getHubId().trim() : null;
                List<HubBriefVm> bridgeHubs = findHubChainDijkstra(
                        currentHubId, currentLat, currentLon,
                        targetHubId, targetLat, targetLon,
                        requiredReserveAfterTargetWh,
                        currentPayloadKg, usableFullWh, referenceDrone, safeWind, networkHubs);

                if (bridgeHubs.isEmpty()) {
                    throw new BadRequestException(
                            MessageCode.MISSION_SEGMENT_EXCEEDS_HUB_NETWORK_RANGE,
                            "segment", String.format("Hub %s -> %s", currentHubId,
                                    targetWp.getName() != null ? targetWp.getName() : "WP#" + (i + 1)));
                }

                for (HubBriefVm bridge : bridgeHubs) {
                    output.add(createAutoHubWaypoint(mission, bridge, stopoverType));
                    hubMap.put(bridge.id(), bridge);
                    insertedHubCount++;
                    notes.add("Bridged long-haul segment via hub " + bridge.name() + " (" + stopoverType.getValue() + ")");
                    currentHubId = bridge.id();
                    currentLat = bridge.latitude();
                    currentLon = bridge.longitude();
                }
                energyUsedWh = 0.0;
                hasAirborneInCurrentFlight = false;
                // Re-evaluate targetWp now that we are within single-charge range from the final bridge hub
            }
        }

        // Finally, verify we can safely fly from the last waypoint to arrivalHub!
        boolean alreadyAtArrival = currentHubId != null && currentHubId.equals(arrHub.id())
                && GeoUtils.haversine(currentLat, currentLon, arrHub.latitude(), arrHub.longitude()) <= MissionLegUtils.HUB_ANCHOR_THRESHOLD_M;

        if (!alreadyAtArrival) {
            double distToArr = GeoUtils.haversine(currentLat, currentLon, arrHub.latitude(), arrHub.longitude());
            double whToArr = MissionLegUtils.estimateEnergyWh(
                    distToArr,
                    hasAirborneInCurrentFlight ? 0.0 : TAKEOFF_LANDING_OVERHEAD_SEC,
                    currentPayloadKg,
                    referenceDrone,
                    safeWind);

            if (energyUsedWh + whToArr > usableFullWh) {
                if (hasAirborneInCurrentFlight || energyUsedWh > 0.0) {
                    HubBriefVm divertHub = findBestReachableDiversionHub(
                            currentLat, currentLon, arrHub.latitude(), arrHub.longitude(),
                            energyUsedWh, usableFullWh, currentPayloadKg, referenceDrone, safeWind, networkHubs, currentHubId);
                    if (divertHub == null) {
                        throw new BadRequestException(
                                MessageCode.MISSION_SEGMENT_EXCEEDS_HUB_NETWORK_RANGE,
                                "segment", "final waypoint -> arrival hub " + arrHub.name());
                    }
                    if (!divertHub.id().equals(arrHub.id())) {
                        output.add(createAutoHubWaypoint(mission, divertHub, stopoverType));
                        hubMap.put(divertHub.id(), divertHub);
                        insertedHubCount++;
                        notes.add("Inserted " + stopoverType.getValue() + " stopover at hub " + divertHub.name()
                                + " before arrival hub " + arrHub.name());
                        currentHubId = divertHub.id();
                        currentLat = divertHub.latitude();
                        currentLon = divertHub.longitude();
                        energyUsedWh = 0.0;
                        hasAirborneInCurrentFlight = false;
                    }
                }

                // Check if remaining gap from currentHub to arrivalHub still needs multi-hop Dijkstra bridging
                double remainingToArrWh = MissionLegUtils.estimateEnergyWh(
                        GeoUtils.haversine(currentLat, currentLon, arrHub.latitude(), arrHub.longitude()),
                        TAKEOFF_LANDING_OVERHEAD_SEC,
                        currentPayloadKg,
                        referenceDrone,
                        safeWind);
                if (remainingToArrWh > usableFullWh) {
                    List<HubBriefVm> bridgeHubs = findHubChainDijkstra(
                            currentHubId, currentLat, currentLon,
                            arrHub.id(), arrHub.latitude(), arrHub.longitude(),
                            0.0,
                            currentPayloadKg, usableFullWh, referenceDrone, safeWind, networkHubs);
                    if (bridgeHubs.isEmpty()) {
                        throw new BadRequestException(
                                MessageCode.MISSION_SEGMENT_EXCEEDS_HUB_NETWORK_RANGE,
                                "segment", "Hub " + currentHubId + " -> arrival hub " + arrHub.name());
                    }
                    for (HubBriefVm bridge : bridgeHubs) {
                        output.add(createAutoHubWaypoint(mission, bridge, stopoverType));
                        hubMap.put(bridge.id(), bridge);
                        insertedHubCount++;
                        notes.add("Bridged final transit via hub " + bridge.name() + " (" + stopoverType.getValue() + ")");
                    }
                }
            }
        }

        // Assign clean sequential 1..M indices on returned copies (non-destructive if preview)
        int seq = 1;
        for (Waypoint wp : output) {
            wp.setSequence(seq++);
        }

        return new RoutePlanResult(output, insertedHubCount, hubMap, notes);
    }

    /**
     * Multi-hop Dijkstra over active hubs returning the minimum-energy sequence of intermediate hubs
     * needed to reach target (lat, lon) with at least {@code requiredReserveAfterTargetWh} remaining.
     */
    public static List<HubBriefVm> findHubChainDijkstra(
            String startHubId,
            double startLat,
            double startLon,
            String targetHubId,
            double targetLat,
            double targetLon,
            double requiredReserveAfterTargetWh,
            double payloadKg,
            double usableWh,
            DroneBriefVm drone,
            double windFactor,
            List<HubBriefVm> networkHubs
    ) {
        if (networkHubs == null || networkHubs.isEmpty()) {
            return List.of();
        }

        // Index 0 = START, 1..H = candidate intermediate hubs, H+1 = TARGET
        List<HubBriefVm> candidates = new ArrayList<>();
        for (HubBriefVm hub : networkHubs) {
            if (hub == null || hub.id() == null || hub.latitude() == null || hub.longitude() == null || !hub.isActive()) {
                continue;
            }
            if (hub.id().equals(startHubId) || hub.id().equals(targetHubId)) {
                continue;
            }
            candidates.add(hub);
        }

        int n = candidates.size();
        int targetIdx = n + 1;
        double[] dist = new double[n + 2];
        int[] prev = new int[n + 2];
        for (int idx = 0; idx < dist.length; idx++) {
            dist[idx] = Double.POSITIVE_INFINITY;
            prev[idx] = -1;
        }
        dist[0] = 0.0;

        record QueueNode(int idx, double cost) {
        }

        PriorityQueue<QueueNode> pq = new PriorityQueue<>(Comparator.comparingDouble(QueueNode::cost));
        pq.add(new QueueNode(0, 0.0));

        while (!pq.isEmpty()) {
            QueueNode cur = pq.poll();
            if (cur.cost() > dist[cur.idx()]) {
                continue;
            }
            if (cur.idx() == targetIdx) {
                break;
            }

            double curLat = cur.idx() == 0 ? startLat : candidates.get(cur.idx() - 1).latitude();
            double curLon = cur.idx() == 0 ? startLon : candidates.get(cur.idx() - 1).longitude();

            // Edge to TARGET (only from intermediate hubs when cur.idx() > 0, since direct START -> TARGET already failed)
            if (cur.idx() > 0) {
                double targetDistM = GeoUtils.haversine(curLat, curLon, targetLat, targetLon);
                double edgeWh = MissionLegUtils.estimateEnergyWh(targetDistM, TAKEOFF_LANDING_OVERHEAD_SEC, payloadKg, drone, windFactor);
                if (edgeWh + requiredReserveAfterTargetWh <= usableWh) {
                    double nextCost = cur.cost() + edgeWh;
                    if (nextCost < dist[targetIdx]) {
                        dist[targetIdx] = nextCost;
                        prev[targetIdx] = cur.idx();
                        pq.add(new QueueNode(targetIdx, nextCost));
                    }
                }
            }

            // Edges to other intermediate hubs
            for (int j = 0; j < n; j++) {
                int nextIdx = j + 1;
                if (nextIdx == cur.idx()) {
                    continue;
                }
                HubBriefVm nextHub = candidates.get(j);
                double hopDistM = GeoUtils.haversine(curLat, curLon, nextHub.latitude(), nextHub.longitude());
                double edgeWh = MissionLegUtils.estimateEnergyWh(hopDistM, TAKEOFF_LANDING_OVERHEAD_SEC, payloadKg, drone, windFactor);
                if (edgeWh <= usableWh) {
                    double nextCost = cur.cost() + edgeWh + HOP_OVERHEAD_WH;
                    if (nextCost < dist[nextIdx]) {
                        dist[nextIdx] = nextCost;
                        prev[nextIdx] = cur.idx();
                        pq.add(new QueueNode(nextIdx, nextCost));
                    }
                }
            }
        }

        if (prev[targetIdx] == -1) {
            return List.of();
        }

        List<HubBriefVm> reversed = new ArrayList<>();
        int trace = prev[targetIdx];
        while (trace > 0) {
            reversed.add(candidates.get(trace - 1));
            trace = prev[trace];
        }
        List<HubBriefVm> ordered = new ArrayList<>(reversed.size());
        for (int k = reversed.size() - 1; k >= 0; k--) {
            ordered.add(reversed.get(k));
        }
        return ordered;
    }

    private static HubBriefVm findBestReachableDiversionHub(
            double currentLat,
            double currentLon,
            double nextTargetLat,
            double nextTargetLon,
            double energyUsedWh,
            double usableWh,
            double payloadKg,
            DroneBriefVm drone,
            double windFactor,
            List<HubBriefVm> networkHubs,
            String currentHubId
    ) {
        HubBriefVm best = null;
        double bestScore = Double.POSITIVE_INFINITY;

        for (HubBriefVm hub : networkHubs) {
            if (hub == null || hub.id() == null || hub.latitude() == null || hub.longitude() == null || !hub.isActive()) {
                continue;
            }
            double distToHub = GeoUtils.haversine(currentLat, currentLon, hub.latitude(), hub.longitude());
            double whToHub = MissionLegUtils.estimateEnergyWh(distToHub, 0.0, payloadKg, drone, windFactor);
            if (energyUsedWh + whToHub <= usableWh) {
                double distFromHubToTarget = GeoUtils.haversine(hub.latitude(), hub.longitude(), nextTargetLat, nextTargetLon);
                double score = distToHub + distFromHubToTarget;
                // Slightly prefer advancing to a different hub if already at currentHubId unless zero-distance
                if (hub.id().equals(currentHubId) && distToHub > MissionLegUtils.HUB_ANCHOR_THRESHOLD_M) {
                    score += 500.0;
                }
                if (score < bestScore) {
                    bestScore = score;
                    best = hub;
                }
            }
        }
        return best;
    }

    private static HubBriefVm findNearestActiveHub(double lat, double lon, List<HubBriefVm> networkHubs) {
        HubBriefVm nearest = null;
        double bestDist = Double.POSITIVE_INFINITY;
        for (HubBriefVm hub : networkHubs) {
            if (hub == null || hub.latitude() == null || hub.longitude() == null || !hub.isActive()) {
                continue;
            }
            double dist = GeoUtils.haversine(lat, lon, hub.latitude(), hub.longitude());
            if (dist < bestDist) {
                bestDist = dist;
                nearest = hub;
            }
        }
        return nearest;
    }

    private static boolean isLastCoordinateBeforeArrival(List<Waypoint> waypoints, int idx, String arrivalHubId) {
        for (int j = idx + 1; j < waypoints.size(); j++) {
            Waypoint next = waypoints.get(j);
            if (MissionLegUtils.isHubStopoverWaypoint(next)) {
                return next.getHubId() != null && next.getHubId().equals(arrivalHubId);
            }
            return false;
        }
        return true;
    }

    private static List<HubBriefVm> collectActiveNetworkHubs(
            List<HubBriefVm> activeHubs,
            Map<String, HubBriefVm> existingHubMap
    ) {
        Map<String, HubBriefVm> merged = new HashMap<>();
        if (activeHubs != null) {
            for (HubBriefVm hub : activeHubs) {
                if (hub != null && hub.id() != null && hub.latitude() != null && hub.longitude() != null && hub.isActive()) {
                    merged.put(hub.id(), hub);
                }
            }
        }
        if (existingHubMap != null) {
            for (HubBriefVm hub : existingHubMap.values()) {
                if (hub != null && hub.id() != null && hub.latitude() != null && hub.longitude() != null && hub.isActive()) {
                    merged.putIfAbsent(hub.id(), hub);
                }
            }
        }
        return new ArrayList<>(merged.values());
    }

    private static Waypoint createAutoHubWaypoint(Mission mission, HubBriefVm hub, StopoverType stopoverType) {
        Waypoint wp = new Waypoint();
        wp.setMission(mission);
        wp.setWaypointType(WaypointType.HUB);
        wp.setHubId(hub.id());
        wp.setName("Hub Stopover: " + (hub.name() != null ? hub.name() : hub.code()));
        wp.setLatitude(hub.latitude());
        wp.setLongitude(hub.longitude());
        wp.setAltitude(0.0);
        wp.setStopoverType(stopoverType);
        wp.setGroundTimeMinutes(stopoverType.getDefaultGroundTimeMinutes());
        wp.setPayloadDeltaKg(0.0);
        wp.setHoverDurationSec(0);
        wp.setWaitForConfirmation(false);
        return wp;
    }

    private static Waypoint copyWaypoint(Waypoint src) {
        Waypoint copy = new Waypoint();
        copy.setId(src.getId());
        copy.setMission(src.getMission());
        copy.setSequence(src.getSequence());
        copy.setName(src.getName());
        copy.setWaypointType(src.getWaypointType() != null ? src.getWaypointType()
                : (src.getHubId() != null && !src.getHubId().isBlank() ? WaypointType.HUB : WaypointType.COORDINATE));
        copy.setLatitude(src.getLatitude());
        copy.setLongitude(src.getLongitude());
        copy.setAltitude(src.getAltitude());
        copy.setSpeedToWaypoint(src.getSpeedToWaypoint());
        copy.setHeadingAtWaypoint(src.getHeadingAtWaypoint());
        copy.setTurnRadius(src.getTurnRadius());
        copy.setWaitForConfirmation(src.getWaitForConfirmation());
        copy.setHubId(src.getHubId());
        copy.setStopoverType(src.getStopoverType());
        copy.setGroundTimeMinutes(src.getGroundTimeMinutes());
        copy.setPayloadDeltaKg(src.getPayloadDeltaKg());
        copy.setHoverDurationSec(src.getHoverDurationSec());
        copy.setActions(src.getActions() != null ? new HashMap<>(src.getActions()) : null);
        copy.setConditions(src.getConditions() != null ? new HashMap<>(src.getConditions()) : null);
        return copy;
    }
}
