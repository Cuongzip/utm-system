package com.utm.mission.service.fleet;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.mission.model.Mission;
import com.utm.mission.model.Waypoint;
import com.utm.mission.repository.MissionRepository;
import com.utm.mission.repository.WaypointRepository;
import com.utm.mission.service.client.DroneClientService;
import com.utm.mission.util.GeoUtils;
import com.utm.mission.viewmodel.client.DroneBriefVm;
import com.utm.mission.viewmodel.fleet.ScoredDroneCandidateVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FleetScoringServiceImpl implements FleetScoringService {

    private static final double BASE_WH_PER_KM = 25.0;
    private static final double PAYLOAD_WH_PER_KM_KG = 8.0;
    private static final double BATTERY_SAFETY_RESERVE_FACTOR = 0.80; // Retain 20% emergency reserve
    private static final double DEFAULT_BATTERY_CAPACITY_WH = 500.0;
    private static final double DEFAULT_MAX_PAYLOAD_KG = 3.0;

    private final MissionRepository missionRepository;
    private final WaypointRepository waypointRepository;
    private final DroneClientService droneClientService;

    @Override
    @Transactional(readOnly = true)
    public List<ScoredDroneCandidateVm> scoreCandidateDrones(String missionId) {
        Mission mission = missionRepository.findById(missionId)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, "id", missionId));

        List<Waypoint> waypoints = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
        double totalDistanceMeters = GeoUtils.calculateTotalDistance(waypoints);
        double distanceKm = totalDistanceMeters / 1000.0;
        double requiredPayloadKg = mission.getPayloadWeightKg() != null ? mission.getPayloadWeightKg() : 0.0;

        double energyConsumptionWh = (BASE_WH_PER_KM + (PAYLOAD_WH_PER_KM_KG * requiredPayloadKg)) * distanceKm;
        energyConsumptionWh = Math.round(energyConsumptionWh * 10.0) / 10.0;

        List<DroneBriefVm> availableDrones = droneClientService.getAvailableDronesAtHub(mission.getDepartureHubId());
        if (availableDrones.isEmpty()) {
            log.info("No available drones returned from Drone service at hub ID: {}", mission.getDepartureHubId());
            return List.of();
        }

        List<ScoredDroneCandidateVm> candidates = new ArrayList<>();
        for (DroneBriefVm drone : availableDrones) {
            candidates.add(evaluateAndScoreDrone(drone, requiredPayloadKg, energyConsumptionWh));
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
                        "No eligible drone found meeting payload and battery requirements for mission ID: " + missionId));
    }

    private ScoredDroneCandidateVm evaluateAndScoreDrone(DroneBriefVm drone, double requiredPayloadKg, double energyNeededWh) {
        double maxPayload = drone.maxPayload() != null ? drone.maxPayload() : DEFAULT_MAX_PAYLOAD_KG;
        double batteryCapacity = drone.batteryCapacityWh() != null ? drone.batteryCapacityWh() : DEFAULT_BATTERY_CAPACITY_WH;
        double usableBattery = batteryCapacity * BATTERY_SAFETY_RESERVE_FACTOR;

        boolean eligible = true;
        String ineligibilityReason = null;

        if (maxPayload < requiredPayloadKg) {
            eligible = false;
            ineligibilityReason = String.format("Insufficient payload capacity (%.1f kg < %.1f kg required)",
                    maxPayload, requiredPayloadKg);
        } else if (usableBattery < energyNeededWh) {
            eligible = false;
            ineligibilityReason = String.format("Insufficient battery range (needed %.1f Wh > usable %.1f Wh with 20%% reserve)",
                    energyNeededWh, usableBattery);
        }

        double batteryMarginPct = 0.0;
        if (usableBattery > 0) {
            batteryMarginPct = Math.max(0.0, Math.min(100.0, ((usableBattery - energyNeededWh) / usableBattery) * 100.0));
            batteryMarginPct = Math.round(batteryMarginPct * 10.0) / 10.0;
        }

        double finalScore = 0.0;
        if (eligible) {
            double batteryScore = batteryMarginPct; // Higher margin -> higher score
            double payloadScore;
            if (requiredPayloadKg <= 0.001) {
                payloadScore = 90.0;
            } else {
                double utilizationRatio = requiredPayloadKg / maxPayload;
                payloadScore = Math.max(50.0, 100.0 - Math.abs(utilizationRatio - 0.70) * 50.0);
            }
            double readinessScore = 95.0;

            finalScore = (0.45 * batteryScore) + (0.35 * payloadScore) + (0.20 * readinessScore);
            finalScore = Math.round(finalScore * 10.0) / 10.0;
        }

        return new ScoredDroneCandidateVm(
                drone.id(),
                drone.registrationNumber(),
                drone.manufacturer(),
                drone.model(),
                maxPayload,
                batteryCapacity,
                energyNeededWh,
                batteryMarginPct,
                eligible,
                ineligibilityReason,
                finalScore
        );
    }
}
