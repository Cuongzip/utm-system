package com.utm.fleet.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.AccessDeniedException;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.commonlibrary.utils.AuthenticationUtils;
import com.utm.commonlibrary.utils.LocaleUtils;
import com.utm.fleet.mapper.FleetMapper;
import com.utm.fleet.model.FleetAssignment;
import com.utm.fleet.model.FleetConfiguration;
import com.utm.fleet.model.RebalancingTask;
import com.utm.fleet.model.enumeration.AssignedByType;
import com.utm.fleet.model.enumeration.AssignmentStatus;
import com.utm.fleet.model.enumeration.RebalancingStatus;
import com.utm.fleet.model.enumeration.RebalancingTrigger;
import com.utm.fleet.repository.FleetAssignmentRepository;
import com.utm.fleet.repository.FleetConfigurationRepository;
import com.utm.fleet.repository.RebalancingTaskRepository;
import com.utm.fleet.service.ScoringEngineService.MissionRequirements;
import com.utm.fleet.service.ScoringEngineService.ScoredDrone;
import com.utm.fleet.service.client.FleetInteropClientService;
import com.utm.fleet.viewmodel.FleetDtos.AlternativeDroneVm;
import com.utm.fleet.viewmodel.FleetDtos.ApproveRebalancingPostVm;
import com.utm.fleet.viewmodel.FleetDtos.AssignDronePostVm;
import com.utm.fleet.viewmodel.FleetDtos.AssignmentResultVm;
import com.utm.fleet.viewmodel.FleetDtos.CancelRebalancingPostVm;
import com.utm.fleet.viewmodel.FleetDtos.CreateRebalancingPostVm;
import com.utm.fleet.viewmodel.FleetDtos.DroneAvailabilityVm;
import com.utm.fleet.viewmodel.FleetDtos.DroneClientVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetAssignmentVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetConfigPostVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetConfigPutVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetConfigurationVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetOverviewVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetThresholdsVm;
import com.utm.fleet.viewmodel.FleetDtos.HubClientVm;
import com.utm.fleet.viewmodel.FleetDtos.HubFleetStatusVm;
import com.utm.fleet.viewmodel.FleetDtos.MissionClientVm;
import com.utm.fleet.viewmodel.FleetDtos.RebalancingRecommendationVm;
import com.utm.fleet.viewmodel.FleetDtos.RebalancingRuleVm;
import com.utm.fleet.viewmodel.FleetDtos.RebalancingTaskVm;
import com.utm.fleet.viewmodel.FleetDtos.RejectAssignmentPostVm;
import com.utm.fleet.viewmodel.FleetDtos.ScoringWeightsVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FleetServiceImpl implements FleetService {

    private final FleetConfigurationRepository configRepository;
    private final FleetAssignmentRepository assignmentRepository;
    private final RebalancingTaskRepository rebalancingRepository;
    private final ScoringEngineService scoringEngine;
    private final FleetInteropClientService interopClient;
    private final FleetMapper fleetMapper;

    @Override
    @Transactional(readOnly = true)
    public FleetOverviewVm getFleetOverview() {
        List<DroneClientVm> drones = interopClient.getAllDrones(null);
        List<HubClientVm> hubs = interopClient.getAllHubs();
        List<MissionClientVm> activeMissions = interopClient.getMissionsByStatus("executing");
        List<MissionClientVm> scheduledMissions = interopClient.getMissionsByStatus("scheduled");

        int[] counts = countDroneStatuses(drones);
        Map<String, List<DroneClientVm>> byHub = groupDronesByHub(drones);
        List<HubFleetStatusVm> hubStatuses = hubs.stream()
                .filter(this::isActiveHub)
                .map(h -> buildHubFleetStatus(h, byHub.getOrDefault(h.id(), List.of())))
                .toList();

        double avgHours = calculateAverageFlightHours(drones);
        int health = calculateFleetHealth(drones);

        return new FleetOverviewVm(
                drones.size(),
                counts[0],
                counts[1],
                counts[2],
                counts[3],
                counts[4],
                activeMissions.size(),
                scheduledMissions.size(),
                hubStatuses,
                health,
                avgHours);
    }

    @Override
    @Transactional(readOnly = true)
    public HubFleetStatusVm getHubStatus(String hubId) {
        HubClientVm hub = interopClient.getHubById(hubId)
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", hubId));
        List<DroneClientVm> drones = interopClient.getAllDrones(hubId);
        return buildHubFleetStatus(hub, drones);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DroneClientVm> getDronesAtHub(String hubId) {
        interopClient.getHubById(hubId)
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", hubId));
        return interopClient.getAllDrones(hubId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DroneAvailabilityVm> getAvailableDrones(String hubId) {
        List<DroneClientVm> drones = interopClient.getAllDrones(hubId);
        List<MissionClientVm> executing = interopClient.getMissionsByStatus("executing");
        List<MissionClientVm> scheduled = interopClient.getMissionsByStatus("scheduled");

        Map<String, MissionClientVm> droneMissionMap = new HashMap<>();
        for (MissionClientVm m : executing) {
            if (m.droneId() != null) {
                droneMissionMap.putIfAbsent(m.droneId(), m);
            }
        }
        for (MissionClientVm m : scheduled) {
            if (m.droneId() != null) {
                droneMissionMap.putIfAbsent(m.droneId(), m);
            }
        }

        return drones.stream()
                .map(d -> {
                    MissionClientVm assigned = droneMissionMap.get(d.id());
                    return new DroneAvailabilityVm(
                            d,
                            d.status(),
                            d.currentHubId() != null ? d.currentHubId() : d.homeHubId(),
                            assigned != null ? assigned.id() : null,
                            estimateAvailableAt(assigned));
                })
                .toList();
    }

    @Override
    @Transactional
    public AssignmentResultVm assignDrone(AssignDronePostVm postVm) {
        if (postVm == null || postVm.missionId() == null || postVm.missionId().isBlank()) {
            throw new BadRequestException(MessageCode.MISSION_NOT_FOUND, "Mission ID is required");
        }
        MissionClientVm mission = interopClient.getMissionById(postVm.missionId())
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, "id", postVm.missionId()));

        boolean vi = LocaleUtils.isVietnamese();
        HubClientVm depHub = interopClient.getHubById(mission.departureHubId())
                .orElse(null);
        if (depHub == null) {
            return new AssignmentResultVm(
                    false,
                    null,
                    null,
                    List.of(),
                    vi ? "Không tìm thấy Hub khởi hành" : "Departure hub not found");
        }

        FleetConfiguration config = ensureActiveConfig();
        ScoringWeightsVm weights = config.getWeights() != null ? config.getWeights() : ScoringWeightsVm.balancedDefault();

        List<DroneAvailabilityVm> availabilities = getAvailableDrones(null);
        List<DroneClientVm> candidatePool = availabilities.stream()
                .filter(da -> da.currentMissionId() == null)
                .map(DroneAvailabilityVm::drone)
                .toList();

        if (candidatePool.isEmpty()) {
            return new AssignmentResultVm(
                    false,
                    null,
                    null,
                    List.of(),
                    vi ? "Không có Drone chưa phân công nào sẵn sàng trong đội bay" : "No unassigned drones available in fleet");
        }

        Map<String, HubClientVm> hubMap = interopClient.getAllHubs().stream()
                .collect(Collectors.toMap(HubClientVm::id, h -> h, (a, b) -> a));
        Map<String, Double> liveBatteries = new HashMap<>();
        for (DroneClientVm d : candidatePool) {
            interopClient.getLatestBatteryLevel(d.id()).ifPresent(b -> liveBatteries.put(d.id(), b));
        }

        MissionRequirements req = new MissionRequirements(
                mission.departureHubId(),
                depHub.latitude(),
                depHub.longitude(),
                mission.estimatedDistance(),
                mission.estimatedDuration(),
                mission.payloadWeightKg(),
                mission.requiredCapabilities());

        double avgHours = calculateAverageFlightHours(candidatePool);
        List<ScoredDrone> scored = scoringEngine.scoreDrones(candidatePool, req, weights, hubMap, liveBatteries, avgHours);
        List<ScoredDrone> eligible = scored.stream().filter(ScoredDrone::eligible).toList();

        if (eligible.isEmpty()) {
            String detail = scored.isEmpty() || scored.get(0).ineligibilityReason() == null
                    ? ""
                    : scored.get(0).ineligibilityReason();
            String reason = (vi ? "Không tìm thấy Drone đủ điều kiện. " : "No eligible drones found. ") + detail;
            return new AssignmentResultVm(false, null, null, scoringEngine.formatAlternatives(scored, 5), reason.trim());
        }

        ScoredDrone selected;
        boolean manualOverride = postVm.operatorOverride() != null && !postVm.operatorOverride().isBlank();
        if (manualOverride) {
            String overrideId = postVm.operatorOverride().trim();
            Optional<ScoredDrone> overrideMatch = eligible.stream()
                    .filter(sd -> overrideId.equals(sd.drone().id()))
                    .findFirst();
            if (overrideMatch.isEmpty()) {
                return new AssignmentResultVm(
                        false,
                        null,
                        null,
                        scoringEngine.formatAlternatives(eligible, 5),
                        vi ? "Drone do điều phái viên chọn không đủ điều kiện" : "Operator-selected drone is not eligible");
            }
            selected = overrideMatch.get();
        } else {
            selected = eligible.get(0);
        }

        List<AlternativeDroneVm> alternatives = scoringEngine.formatAlternatives(
                eligible.stream().filter(sd -> !sd.drone().id().equals(selected.drone().id())).toList(),
                4);

        FleetAssignment assignment = new FleetAssignment();
        assignment.setMissionId(mission.id());
        assignment.setDroneId(selected.drone().id());
        assignment.setScores(selected.scores());
        assignment.setWeights(weights);
        assignment.setFinalScore(selected.finalScore());
        assignment.setStatus(AssignmentStatus.PENDING);
        assignment.setAssignedBy(manualOverride ? AssignedByType.OPERATOR : AssignedByType.SYSTEM);
        assignment.setOperatorId(manualOverride ? resolveActorId(null) : null);
        assignment.setAlternativeDrones(alternatives);
        assignment.setAssignedAt(ZonedDateTime.now());

        FleetAssignment saved = assignmentRepository.save(assignment);
        return new AssignmentResultVm(true, fleetMapper.toAssignmentVm(saved), selected.drone(), alternatives, null);
    }

    @Override
    @Transactional
    public FleetAssignmentVm acceptAssignment(String id) {
        FleetAssignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLEET_ASSIGNMENT_NOT_FOUND, "id", id));
        if (assignment.getStatus() != AssignmentStatus.PENDING) {
            throw new BadRequestException(MessageCode.FLEET_ASSIGNMENT_INVALID_STATE,
                    "Only pending assignments can be accepted");
        }
        assignment.setStatus(AssignmentStatus.ACCEPTED);
        assignment.setOperatorId(resolveActorId(assignment.getOperatorId()));
        FleetAssignment saved = assignmentRepository.save(assignment);

        if (saved.getDroneId() != null) {
            interopClient.updateDroneStatus(saved.getDroneId(), "standby");
            interopClient.updateMissionDrone(saved.getMissionId(), saved.getDroneId());
        }
        return fleetMapper.toAssignmentVm(saved);
    }

    @Override
    @Transactional
    public FleetAssignmentVm rejectAssignment(String id, RejectAssignmentPostVm postVm) {
        FleetAssignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLEET_ASSIGNMENT_NOT_FOUND, "id", id));
        if (assignment.getStatus() != AssignmentStatus.PENDING) {
            throw new BadRequestException(MessageCode.FLEET_ASSIGNMENT_INVALID_STATE,
                    "Only pending assignments can be rejected");
        }
        assignment.setStatus(AssignmentStatus.REJECTED);
        assignment.setRejectionReason(postVm != null && postVm.reason() != null ? postVm.reason().trim() : "Rejected by operator");
        assignment.setOperatorId(resolveActorId(assignment.getOperatorId()));
        FleetAssignment saved = assignmentRepository.save(assignment);

        if (postVm != null && postVm.alternativeDroneId() != null && !postVm.alternativeDroneId().isBlank()) {
            AssignmentResultVm reassigned = assignDrone(new AssignDronePostVm(
                    assignment.getMissionId(),
                    postVm.alternativeDroneId().trim()));
            if (reassigned.success() && reassigned.assignment() != null) {
                return reassigned.assignment();
            }
        }
        return fleetMapper.toAssignmentVm(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FleetAssignmentVm> getAssignmentHistory(String missionId) {
        return fleetMapper.toAssignmentVmList(assignmentRepository.findByMissionIdOrderByCreatedOnDesc(missionId));
    }

    @Override
    @Transactional
    public List<RebalancingRecommendationVm> analyzeRebalancingNeeds() {
        FleetConfiguration config = ensureActiveConfig();
        FleetThresholdsVm thresholds = config.getThresholds() != null
                ? config.getThresholds()
                : FleetThresholdsVm.balancedDefault();

        if (thresholds.quietHoursOnly() && !isWithinQuietHours(thresholds)) {
            return List.of();
        }

        long activeRepositions = rebalancingRepository.countByStatus(RebalancingStatus.IN_PROGRESS);
        if (activeRepositions >= thresholds.maxConcurrentRepositions()) {
            return List.of();
        }

        List<DroneClientVm> allDrones = interopClient.getAllDrones(null);
        List<HubClientVm> allHubs = interopClient.getAllHubs();
        Map<String, List<DroneClientVm>> dronesByHub = groupDronesByHub(allDrones);

        List<HubFleetStatusVm> hubStatuses = allHubs.stream()
                .filter(this::isActiveHub)
                .map(h -> buildHubFleetStatus(h, dronesByHub.getOrDefault(h.id(), List.of())))
                .toList();

        List<HubFleetStatusVm> needyHubs = hubStatuses.stream()
                .filter(hs -> hs.availableDrones() < thresholds.minDronesPerHub())
                .toList();
        List<HubFleetStatusVm> donorHubs = hubStatuses.stream()
                .filter(hs -> hs.availableDrones() > thresholds.minDonorReserve())
                .toList();

        List<RebalancingRecommendationVm> recommendations = new ArrayList<>();
        for (HubFleetStatusVm needy : needyHubs) {
            for (HubFleetStatusVm donor : donorHubs) {
                if (needy.hubId().equals(donor.hubId())) {
                    continue;
                }
                List<DroneClientVm> donorAvailable = dronesByHub.getOrDefault(donor.hubId(), List.of()).stream()
                        .filter(d -> isAvailableStatus(d.status()))
                        .sorted(Comparator.comparingDouble(d -> d.totalFlightHours() != null ? d.totalFlightHours() : 0.0))
                        .toList();
                if (donorAvailable.size() <= thresholds.minDonorReserve()) {
                    continue;
                }

                DroneClientVm chosen = null;
                for (DroneClientVm candidate : donorAvailable) {
                    double batt = interopClient.getLatestBatteryLevel(candidate.id())
                            .orElse(candidate.batteryHealthPct() != null ? candidate.batteryHealthPct() : 90.0);
                    if (batt >= thresholds.minBatteryForReposition()) {
                        chosen = candidate;
                        break;
                    }
                }
                if (chosen == null) {
                    continue;
                }

                int priority = (needy.availableDrones() == 0 ? 100 : (needy.availableDrones() == 1 ? 50 : 25))
                        + (donor.availableDrones() > 5 ? 10 : 0);
                String reason = LocaleUtils.isVietnamese()
                        ? String.format("Hub %s hiện có %d Drone sẵn sàng (tối thiểu: %d)",
                                needy.hubName(), needy.availableDrones(), thresholds.minDronesPerHub())
                        : String.format("Hub %s has %d available drones (minimum: %d)",
                                needy.hubName(), needy.availableDrones(), thresholds.minDronesPerHub());

                recommendations.add(new RebalancingRecommendationVm(
                        donor,
                        needy,
                        chosen,
                        RebalancingTrigger.THRESHOLD_BREACH.getValue(),
                        priority,
                        reason));
            }
        }

        recommendations.sort(Comparator.comparingInt(RebalancingRecommendationVm::priority).reversed());
        return recommendations;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RebalancingTaskVm> getPendingRebalancingTasks() {
        return fleetMapper.toRebalancingVmList(
                rebalancingRepository.findByStatusOrderByPriorityDescCreatedOnAsc(RebalancingStatus.PENDING));
    }

    @Override
    @Transactional(readOnly = true)
    public List<RebalancingTaskVm> getActiveRebalancingTasks() {
        return fleetMapper.toRebalancingVmList(
                rebalancingRepository.findByStatusInOrderByPriorityDescCreatedOnAsc(
                        List.of(RebalancingStatus.APPROVED, RebalancingStatus.IN_PROGRESS)));
    }

    @Override
    @Transactional(readOnly = true)
    public List<RebalancingTaskVm> getRebalancingHistory(int limit, int offset) {
        int safeLimit = Math.min(Math.max(limit > 0 ? limit : 20, 1), 200);
        int page = Math.max(0, offset) / safeLimit;
        return fleetMapper.toRebalancingVmList(
                rebalancingRepository.findAllByOrderByCreatedOnDesc(PageRequest.of(page, safeLimit)));
    }

    @Override
    @Transactional
    public RebalancingTaskVm createRebalancingTask(CreateRebalancingPostVm postVm) {
        HubClientVm sourceHub = interopClient.getHubById(postVm.sourceHubId())
                .orElseThrow(() -> new NotFoundException(MessageCode.DEPARTURE_HUB_NOT_FOUND, "id", postVm.sourceHubId()));
        HubClientVm targetHub = interopClient.getHubById(postVm.targetHubId())
                .orElseThrow(() -> new NotFoundException(MessageCode.ARRIVAL_HUB_NOT_FOUND, "id", postVm.targetHubId()));
        DroneClientVm drone = interopClient.getDroneById(postVm.droneId())
                .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id", postVm.droneId()));

        FleetConfiguration config = ensureActiveConfig();
        int minDrones = config.getThresholds() != null ? config.getThresholds().minDronesPerHub() : 2;
        int targetAvailable = (int) interopClient.getAllDrones(targetHub.id()).stream()
                .filter(d -> isAvailableStatus(d.status()))
                .count();

        boolean autoApprove = Boolean.TRUE.equals(postVm.autoApprove());
        RebalancingTask task = new RebalancingTask();
        task.setSourceHubId(sourceHub.id());
        task.setTargetHubId(targetHub.id());
        task.setDroneId(drone.id());
        task.setTrigger(RebalancingTrigger.MANUAL);
        task.setRule(new RebalancingRuleVm(
                "manual",
                "Manual rebalancing transfer from " + sourceHub.name() + " to " + targetHub.name(),
                minDrones,
                targetAvailable));
        task.setPriority(50);
        task.setStatus(autoApprove ? RebalancingStatus.APPROVED : RebalancingStatus.PENDING);
        if (autoApprove) {
            task.setApprovedAt(ZonedDateTime.now());
            task.setApprovedBy(resolveActorId("system"));
        }

        return fleetMapper.toRebalancingVm(rebalancingRepository.save(task));
    }

    @Override
    @Transactional
    public RebalancingTaskVm approveRebalancingTask(String id, ApproveRebalancingPostVm postVm) {
        RebalancingTask task = rebalancingRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.REBALANCING_TASK_NOT_FOUND, "id", id));
        if (task.getStatus() != RebalancingStatus.PENDING) {
            throw new BadRequestException(MessageCode.REBALANCING_INVALID_STATE,
                    "Cannot approve rebalancing task in " + task.getStatus() + " status");
        }
        task.setStatus(RebalancingStatus.APPROVED);
        task.setApprovedBy(resolveActorId(postVm != null ? postVm.operatorId() : null));
        task.setApprovedAt(ZonedDateTime.now());
        return fleetMapper.toRebalancingVm(rebalancingRepository.save(task));
    }

    @Override
    @Transactional
    public RebalancingTaskVm executeRebalancingTask(String id) {
        RebalancingTask task = rebalancingRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.REBALANCING_TASK_NOT_FOUND, "id", id));
        if (task.getStatus() != RebalancingStatus.APPROVED) {
            throw new BadRequestException(MessageCode.REBALANCING_INVALID_STATE,
                    "Only approved rebalancing tasks can be executed");
        }

        HubClientVm sourceHub = interopClient.getHubById(task.getSourceHubId())
                .orElseThrow(() -> new NotFoundException(MessageCode.DEPARTURE_HUB_NOT_FOUND, "id", task.getSourceHubId()));
        HubClientVm targetHub = interopClient.getHubById(task.getTargetHubId())
                .orElseThrow(() -> new NotFoundException(MessageCode.ARRIVAL_HUB_NOT_FOUND, "id", task.getTargetHubId()));

        Optional<String> missionId = interopClient.createRepositioningMission(task.getDroneId(), sourceHub, targetHub);
        Optional<String> flightId = interopClient.createRepositioningFlight(
                missionId.orElse(null), task.getDroneId(), sourceHub, targetHub);

        task.setRepositioningMissionId(missionId.orElse(null));
        task.setRepositioningFlightId(flightId.orElse(null));
        task.setStatus(RebalancingStatus.IN_PROGRESS);
        task.setStartedAt(ZonedDateTime.now());

        interopClient.updateDroneStatus(task.getDroneId(), "standby");
        return fleetMapper.toRebalancingVm(rebalancingRepository.save(task));
    }

    @Override
    @Transactional
    public RebalancingTaskVm cancelRebalancingTask(String id, CancelRebalancingPostVm postVm) {
        RebalancingTask task = rebalancingRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.REBALANCING_TASK_NOT_FOUND, "id", id));
        if (task.getStatus() == RebalancingStatus.COMPLETED
                || task.getStatus() == RebalancingStatus.CANCELLED
                || task.getStatus() == RebalancingStatus.FAILED) {
            throw new BadRequestException(MessageCode.REBALANCING_INVALID_STATE,
                    "Cannot cancel rebalancing task in " + task.getStatus() + " status");
        }
        task.setStatus(RebalancingStatus.CANCELLED);
        task.setCancelledReason(postVm != null && postVm.reason() != null && !postVm.reason().isBlank()
                ? postVm.reason().trim()
                : "Cancelled by operator");
        return fleetMapper.toRebalancingVm(rebalancingRepository.save(task));
    }

    @Override
    @Transactional
    public RebalancingTaskVm completeRebalancingTask(String id) {
        RebalancingTask task = rebalancingRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.REBALANCING_TASK_NOT_FOUND, "id", id));
        if (task.getStatus() == RebalancingStatus.CANCELLED || task.getStatus() == RebalancingStatus.FAILED) {
            throw new BadRequestException(MessageCode.REBALANCING_INVALID_STATE,
                    "Cannot complete cancelled or failed rebalancing task");
        }
        task.setStatus(RebalancingStatus.COMPLETED);
        task.setCompletedAt(ZonedDateTime.now());
        interopClient.updateDroneHub(task.getDroneId(), task.getTargetHubId());
        interopClient.updateDroneStatus(task.getDroneId(), "available");
        return fleetMapper.toRebalancingVm(rebalancingRepository.save(task));
    }

    @Override
    @Transactional
    public FleetConfigurationVm getActiveConfig() {
        return fleetMapper.toConfigVm(ensureActiveConfig());
    }

    @Override
    @Transactional(readOnly = true)
    public List<FleetConfigurationVm> getAllConfigs() {
        return fleetMapper.toConfigVmList(configRepository.findAllByOrderByIsActiveDescIsPresetDescNameAsc());
    }

    @Override
    @Transactional(readOnly = true)
    public FleetConfigurationVm getConfigById(String id) {
        FleetConfiguration config = configRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLEET_CONFIG_NOT_FOUND, "id", id));
        return fleetMapper.toConfigVm(config);
    }

    @Override
    @Transactional
    public FleetConfigurationVm createConfig(FleetConfigPostVm postVm) {
        if (postVm == null || postVm.name() == null || postVm.name().isBlank()) {
            throw new BadRequestException(MessageCode.FLEET_CONFIG_NOT_FOUND, "Configuration name is required");
        }
        String name = postVm.name().trim();
        if (configRepository.existsByNameIgnoreCase(name)) {
            throw new DuplicatedException(MessageCode.FLEET_CONFIG_NAME_ALREADY_EXISTED, "name", name);
        }

        FleetConfiguration config = new FleetConfiguration();
        config.setName(name);
        config.setDescription(postVm.description());
        config.setWeights(postVm.weights() != null ? postVm.weights() : ScoringWeightsVm.balancedDefault());
        config.setThresholds(postVm.thresholds() != null ? postVm.thresholds() : FleetThresholdsVm.balancedDefault());
        config.setIsPreset(false);
        config.setIsActive(false);
        return fleetMapper.toConfigVm(configRepository.save(config));
    }

    @Override
    @Transactional
    public FleetConfigurationVm updateConfig(String id, FleetConfigPutVm putVm) {
        FleetConfiguration config = configRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLEET_CONFIG_NOT_FOUND, "id", id));
        if (Boolean.TRUE.equals(config.getIsPreset())) {
            throw new AccessDeniedException(MessageCode.FLEET_PRESET_IMMUTABLE);
        }

        if (putVm.name() != null && !putVm.name().isBlank() && !putVm.name().trim().equalsIgnoreCase(config.getName())) {
            if (configRepository.existsByNameIgnoreCase(putVm.name().trim())) {
                throw new DuplicatedException(MessageCode.FLEET_CONFIG_NAME_ALREADY_EXISTED, "name", putVm.name().trim());
            }
            config.setName(putVm.name().trim());
        }
        if (putVm.description() != null) {
            config.setDescription(putVm.description());
        }
        if (putVm.weights() != null) {
            config.setWeights(putVm.weights());
        }
        if (putVm.thresholds() != null) {
            config.setThresholds(putVm.thresholds());
        }
        return fleetMapper.toConfigVm(configRepository.save(config));
    }

    @Override
    @Transactional
    public FleetConfigurationVm activateConfig(String id) {
        FleetConfiguration config = configRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLEET_CONFIG_NOT_FOUND, "id", id));
        configRepository.deactivateAll();
        config.setIsActive(true);
        return fleetMapper.toConfigVm(configRepository.save(config));
    }

    @Override
    @Transactional
    public void handleFlightLifecycleEvent(FlightLifecycleEvent event) {
        if (event == null || event.eventType() == null) {
            return;
        }
        if (FlightLifecycleEvent.FLIGHT_COMPLETED.equals(event.eventType())) {
            Optional<RebalancingTask> matching = Optional.empty();
            if (event.flightId() != null) {
                matching = rebalancingRepository.findFirstByRepositioningFlightIdAndStatus(
                        event.flightId(), RebalancingStatus.IN_PROGRESS);
            }
            if (matching.isEmpty() && event.droneId() != null) {
                matching = rebalancingRepository.findFirstByDroneIdAndStatusOrderByCreatedOnDesc(
                        event.droneId(), RebalancingStatus.IN_PROGRESS);
            }
            matching.ifPresent(task -> {
                log.info("Auto-completing rebalancing task {} upon flight {} completion", task.getId(), event.flightId());
                completeRebalancingTask(task.getId());
            });
        } else if (FlightLifecycleEvent.FLIGHT_CANCELLED.equals(event.eventType())
                || FlightLifecycleEvent.FLIGHT_EMERGENCY_LANDING.equals(event.eventType())) {
            if (event.flightId() != null) {
                rebalancingRepository.findFirstByRepositioningFlightIdAndStatus(
                        event.flightId(), RebalancingStatus.IN_PROGRESS).ifPresent(task -> {
                    task.setStatus(RebalancingStatus.FAILED);
                    task.setFailureReason("Repositioning flight terminated with event: " + event.eventType());
                    rebalancingRepository.save(task);
                });
            }
        }
    }

    private FleetConfiguration ensureActiveConfig() {
        return configRepository.findFirstByIsActiveTrue().orElseGet(() -> {
            FleetConfiguration fallback = new FleetConfiguration();
            fallback.setName("Balanced Mode");
            fallback.setDescription("Balance efficiency with fleet health and capability matching");
            fallback.setWeights(ScoringWeightsVm.balancedDefault());
            fallback.setThresholds(FleetThresholdsVm.balancedDefault());
            fallback.setIsPreset(true);
            fallback.setIsActive(true);
            return configRepository.save(fallback);
        });
    }

    private HubFleetStatusVm buildHubFleetStatus(HubClientVm hub, List<DroneClientVm> drones) {
        int[] counts = countDroneStatuses(drones);
        int cap = hub.maxDroneCapacity() != null && hub.maxDroneCapacity() > 0 ? hub.maxDroneCapacity() : 0;
        double util = cap > 0 ? Math.round(((double) drones.size() / cap) * 10000.0) / 100.0 : 0.0;
        List<String> ids = drones.stream().map(DroneClientVm::id).toList();
        return new HubFleetStatusVm(
                hub.id(),
                hub.name(),
                drones.size(),
                counts[0],
                counts[1],
                counts[2],
                counts[3],
                ids,
                util,
                ZonedDateTime.now());
    }

    private int[] countDroneStatuses(List<DroneClientVm> drones) {
        int available = 0;
        int busy = 0;
        int charging = 0;
        int maintenance = 0;
        int offline = 0;
        for (DroneClientVm d : drones) {
            String s = d.status() != null ? d.status().toLowerCase(Locale.ROOT) : "";
            switch (s) {
                case "available" -> available++;
                case "in_flight", "flying", "executing", "busy", "standby" -> busy++;
                case "charging" -> charging++;
                case "maintenance" -> maintenance++;
                default -> offline++;
            }
        }
        return new int[] { available, busy, charging, maintenance, offline };
    }

    private Map<String, List<DroneClientVm>> groupDronesByHub(List<DroneClientVm> drones) {
        Map<String, List<DroneClientVm>> grouped = new HashMap<>();
        for (DroneClientVm d : drones) {
            String hubId = d.currentHubId() != null && !d.currentHubId().isBlank() ? d.currentHubId() : d.homeHubId();
            if (hubId != null && !hubId.isBlank()) {
                grouped.computeIfAbsent(hubId, k -> new ArrayList<>()).add(d);
            }
        }
        return grouped;
    }

    private boolean isAvailableStatus(String status) {
        return status != null && "available".equalsIgnoreCase(status.trim());
    }

    private boolean isActiveHub(HubClientVm hub) {
        return hub != null && (hub.status() == null || !"inactive".equalsIgnoreCase(hub.status().trim()));
    }

    private double calculateAverageFlightHours(List<DroneClientVm> drones) {
        if (drones == null || drones.isEmpty()) {
            return 0.0;
        }
        double total = drones.stream()
                .mapToDouble(d -> d.totalFlightHours() != null ? d.totalFlightHours() : 0.0)
                .sum();
        return Math.round((total / drones.size()) * 100.0) / 100.0;
    }

    private int calculateFleetHealth(List<DroneClientVm> drones) {
        if (drones == null || drones.isEmpty()) {
            return 100;
        }
        double sum = 0.0;
        ZonedDateTime now = ZonedDateTime.now();
        for (DroneClientVm d : drones) {
            double score = d.batteryHealthPct() != null ? d.batteryHealthPct() : 100.0;
            if (d.status() != null && "maintenance".equalsIgnoreCase(d.status())) {
                score -= 50.0;
            }
            if (d.nextMaintenance() != null && d.nextMaintenance().isBefore(now)) {
                score -= 30.0;
            }
            double hoursRatio = (d.totalFlightHours() != null ? d.totalFlightHours() : 0.0) / 500.0;
            if (hoursRatio > 1.0) {
                score -= Math.min(20.0, (hoursRatio - 1.0) * 20.0);
            }
            sum += Math.max(0.0, Math.min(100.0, score));
        }
        return (int) Math.round(sum / drones.size());
    }

    private ZonedDateTime estimateAvailableAt(MissionClientVm mission) {
        if (mission == null) {
            return null;
        }
        int dur = mission.estimatedDuration() != null && mission.estimatedDuration() > 0
                ? mission.estimatedDuration()
                : 1800;
        if ("scheduled".equalsIgnoreCase(mission.status()) && mission.scheduledAt() != null) {
            return mission.scheduledAt().plusSeconds(dur);
        }
        if ("executing".equalsIgnoreCase(mission.status())) {
            ZonedDateTime base = mission.createdOn() != null ? mission.createdOn() : ZonedDateTime.now();
            return base.plusSeconds(dur);
        }
        return null;
    }

    private boolean isWithinQuietHours(FleetThresholdsVm thresholds) {
        if (thresholds.quietHoursStart() == null || thresholds.quietHoursEnd() == null) {
            return true;
        }
        int hour = LocalTime.now().getHour();
        int start = thresholds.quietHoursStart();
        int end = thresholds.quietHoursEnd();
        if (start < end) {
            return hour >= start && hour < end;
        }
        return hour >= start || hour < end;
    }

    private String resolveActorId(String fallback) {
        try {
            return AuthenticationUtils.extractUserId();
        } catch (Exception ignored) {
            return fallback != null && !fallback.isBlank() ? fallback.trim() : "system";
        }
    }
}
