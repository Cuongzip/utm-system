package com.utm.mission.service.fleet;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.mission.model.Mission;
import com.utm.mission.model.Waypoint;
import com.utm.mission.repository.MissionRepository;
import com.utm.mission.repository.WaypointRepository;
import com.utm.mission.service.client.DroneClientService;
import com.utm.mission.service.client.HubClientService;
import com.utm.mission.util.MissionLegUtils;
import com.utm.mission.viewmodel.client.DroneBriefVm;
import com.utm.mission.viewmodel.client.HubBriefVm;
import com.utm.mission.viewmodel.fleet.ScoredDroneCandidateVm;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
public class FleetScoringServiceImpl implements FleetScoringService {

    private final MissionRepository missionRepository;
    private final WaypointRepository waypointRepository;
    private final DroneClientService droneClientService;
    private final HubClientService hubClientService;

    @Autowired
    public FleetScoringServiceImpl(
            MissionRepository missionRepository,
            WaypointRepository waypointRepository,
            DroneClientService droneClientService,
            @Autowired(required = false) HubClientService hubClientService
    ) {
        this.missionRepository = missionRepository;
        this.waypointRepository = waypointRepository;
        this.droneClientService = droneClientService;
        this.hubClientService = hubClientService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ScoredDroneCandidateVm> scoreCandidateDrones(String missionId) {
        Mission mission = missionRepository.findById(missionId)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, "id", missionId));

        List<Waypoint> waypoints = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
        Map<String, HubBriefVm> hubMap = fetchRelevantHubs(mission, waypoints);
        List<MissionLegUtils.PlannedLegSpec> legs = MissionLegUtils.decomposeIntoLegs(mission, waypoints, hubMap);

        List<DroneBriefVm> availableDrones = droneClientService.getAvailableDronesAtHub(mission.getDepartureHubId());
        if (availableDrones.isEmpty()) {
            log.info("No available drones returned from Drone service at hub ID: {}", mission.getDepartureHubId());
            return List.of();
        }

        double maxLegPayload = legs.stream()
                .mapToDouble(MissionLegUtils.PlannedLegSpec::payloadWeightKg)
                .max()
                .orElse(mission.getPayloadWeightKg() != null ? mission.getPayloadWeightKg() : 0.0);

        List<ScoredDroneCandidateVm> candidates = new ArrayList<>();
        for (DroneBriefVm drone : availableDrones) {
            List<MissionLegUtils.BatteryCycleSegment> segments = MissionLegUtils.calculateCumulativeBatterySegments(legs, drone, 1.0);
            candidates.add(evaluateAndScoreDroneForSegments(
                    drone, mission.getDepartureHubId(), maxLegPayload, segments, mission.getRequiredCapabilities()));
        }

        candidates.sort(Comparator.comparing(ScoredDroneCandidateVm::finalScore).reversed());
        return candidates;
    }

    @Override
    @Transactional(readOnly = true)
    public ScoredDroneCandidateVm getBestCandidate(String missionId) {
        List<ScoredDroneCandidateVm> candidates = scoreCandidateDrones(missionId);
        return candidates.stream()
                .filter(ScoredDroneCandidateVm::eligible)
                .findFirst()
                .orElseThrow(() -> new BadRequestException(
                        MessageCode.DRONE_NOT_AVAILABLE,
                        "No eligible drone found meeting payload, capability, and battery requirements for mission ID: " + missionId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ScoredDroneCandidateVm> scoreCandidateDronesForLeg(MissionLegUtils.PlannedLegSpec leg) {
        if (leg == null || leg.departureHubId() == null) {
            return List.of();
        }
        List<DroneBriefVm> availableDrones = droneClientService.getAvailableDronesAtHub(leg.departureHubId());
        if (availableDrones.isEmpty()) {
            return List.of();
        }

        List<ScoredDroneCandidateVm> candidates = new ArrayList<>();
        for (DroneBriefVm drone : availableDrones) {
            double legEnergyWh = MissionLegUtils.estimateEnergyWh(
                    leg.distanceMeters(), leg.totalHoverSeconds(), leg.payloadWeightKg(), drone);
            MissionLegUtils.BatteryCycleSegment singleSegment = new MissionLegUtils.BatteryCycleSegment(
                    0, leg.legIndex(), leg.legIndex(), true, legEnergyWh, List.of(leg.legIndex()));
            candidates.add(evaluateAndScoreDroneForSegments(
                    drone, leg.departureHubId(), leg.payloadWeightKg(), List.of(singleSegment), null));
        }
        candidates.sort(Comparator.comparing(ScoredDroneCandidateVm::finalScore).reversed());
        return candidates;
    }

    @Override
    @Transactional(readOnly = true)
    public ScoredDroneCandidateVm getBestCandidateForLeg(MissionLegUtils.PlannedLegSpec leg) {
        return scoreCandidateDronesForLeg(leg).stream()
                .filter(ScoredDroneCandidateVm::eligible)
                .findFirst()
                .orElseThrow(() -> new BadRequestException(
                        MessageCode.DRONE_NOT_AVAILABLE,
                        "No eligible drone found at hub " + leg.departureHubId() + " for leg " + (leg.legIndex() + 1)));
    }

    private Map<String, HubBriefVm> fetchRelevantHubs(Mission mission, List<Waypoint> waypoints) {
        if (hubClientService == null) {
            return Map.of();
        }
        Set<String> hubIds = new HashSet<>();
        if (mission.getDepartureHubId() != null) {
            hubIds.add(mission.getDepartureHubId());
        }
        if (mission.getArrivalHubId() != null) {
            hubIds.add(mission.getArrivalHubId());
        }
        for (Waypoint wp : waypoints) {
            if (wp.getHubId() != null && !wp.getHubId().isBlank()) {
                hubIds.add(wp.getHubId().trim());
            }
        }
        return hubClientService.getHubsByIds(hubIds);
    }

    private ScoredDroneCandidateVm evaluateAndScoreDroneForSegments(
            DroneBriefVm drone,
            String requiredHubId,
            double requiredPayloadKg,
            List<MissionLegUtils.BatteryCycleSegment> segments,
            List<String> requiredCapabilities
    ) {
        double maxPayload = drone.maxPayload() != null ? drone.maxPayload() : MissionLegUtils.DEFAULT_MAX_PAYLOAD_KG;
        double batteryCapacity = drone.batteryCapacityWh() != null ? drone.batteryCapacityWh() : MissionLegUtils.DEFAULT_BATTERY_CAPACITY_WH;
        double currentBatteryPct = drone.currentBatteryPct() != null ? Math.max(0.0, Math.min(100.0, drone.currentBatteryPct())) : 100.0;
        double batteryHealthPct = drone.batteryHealthPct() != null ? Math.max(10.0, Math.min(100.0, drone.batteryHealthPct())) : 100.0;

        double initialUsableWh = MissionLegUtils.usableBatteryWh(drone, currentBatteryPct);
        double rechargedUsableWh = MissionLegUtils.usableBatteryWh(drone, 100.0);

        boolean eligible = true;
        String ineligibilityReason = null;

        if (maxPayload < requiredPayloadKg) {
            eligible = false;
            ineligibilityReason = String.format("Insufficient payload capacity (%.1f kg < %.1f kg required)",
                    maxPayload, requiredPayloadKg);
        }

        if (eligible && requiredCapabilities != null && !requiredCapabilities.isEmpty()) {
            Set<String> droneCaps = drone.capabilities() != null
                    ? drone.capabilities().stream()
                            .filter(c -> c != null && !c.isBlank())
                            .map(c -> c.trim().toLowerCase(Locale.ROOT))
                            .collect(Collectors.toSet())
                    : Set.of();
            List<String> missingCaps = requiredCapabilities.stream()
                    .filter(c -> c != null && !c.isBlank())
                    .filter(c -> !droneCaps.contains(c.trim().toLowerCase(Locale.ROOT)))
                    .toList();
            if (!missingCaps.isEmpty()) {
                eligible = false;
                ineligibilityReason = "Missing required capabilities: " + String.join(", ", missingCaps);
            }
        }

        double maxSegmentEnergyWh = 0.0;
        double worstMarginPct = 100.0;

        for (MissionLegUtils.BatteryCycleSegment segment : segments) {
            double segmentUsableWh = segment.usesInitialBattery() ? initialUsableWh : rechargedUsableWh;
            double segEnergy = segment.cumulativeEnergyWh();
            if (segEnergy > maxSegmentEnergyWh) {
                maxSegmentEnergyWh = segEnergy;
            }
            if (eligible && segmentUsableWh < segEnergy) {
                eligible = false;
                ineligibilityReason = String.format(
                        "Insufficient battery range on battery segment %d (legs %d-%d: cumulative %.1f Wh > usable %.1f Wh with 20%% reserve)",
                        segment.segmentIndex() + 1,
                        segment.startLegIndex() + 1,
                        segment.endLegIndex() + 1,
                        segEnergy,
                        segmentUsableWh);
            }
            double segMargin = segmentUsableWh > 0
                    ? Math.max(0.0, Math.min(100.0, ((segmentUsableWh - segEnergy) / segmentUsableWh) * 100.0))
                    : 0.0;
            if (segMargin < worstMarginPct) {
                worstMarginPct = segMargin;
            }
        }

        if (segments.isEmpty()) {
            worstMarginPct = initialUsableWh > 0 ? 100.0 : 0.0;
        }
        double batteryMarginPct = Math.round(worstMarginPct * 10.0) / 10.0;

        double finalScore = 0.0;
        if (eligible) {
            double batteryMarginScore = batteryMarginPct;

            double proximityScore;
            if (requiredHubId != null && requiredHubId.equals(drone.currentHubId())) {
                proximityScore = 100.0;
            } else if (requiredHubId != null && requiredHubId.equals(drone.homeHubId())) {
                proximityScore = 85.0;
            } else {
                proximityScore = 60.0;
            }

            double payloadCapabilityScore;
            if (requiredPayloadKg <= 0.001) {
                payloadCapabilityScore = 90.0;
            } else {
                double utilizationRatio = requiredPayloadKg / maxPayload;
                payloadCapabilityScore = Math.max(50.0, 100.0 - Math.abs(utilizationRatio - 0.70) * 50.0);
            }

            double totalHours = drone.totalFlightHours() != null ? Math.max(0.0, drone.totalFlightHours()) : 0.0;
            double utilizationBalanceScore = Math.max(40.0, 100.0 - (totalHours * 0.5));

            double maintenanceHealthScore = batteryHealthPct;

            finalScore = (0.30 * batteryMarginScore)
                    + (0.25 * proximityScore)
                    + (0.20 * payloadCapabilityScore)
                    + (0.15 * utilizationBalanceScore)
                    + (0.10 * maintenanceHealthScore);
            finalScore = Math.round(finalScore * 10.0) / 10.0;
        }

        return new ScoredDroneCandidateVm(
                drone.id(),
                drone.registrationNumber(),
                drone.manufacturer(),
                drone.model(),
                maxPayload,
                batteryCapacity,
                maxSegmentEnergyWh,
                batteryMarginPct,
                eligible,
                ineligibilityReason,
                finalScore
        );
    }
}
