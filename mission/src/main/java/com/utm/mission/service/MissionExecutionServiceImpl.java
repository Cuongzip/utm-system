package com.utm.mission.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.generator.BusinessCodeGenerator;
import com.utm.commonlibrary.generator.CodePatternRule;
import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.mission.mapper.MissionExecutionMapper;
import com.utm.mission.model.Mission;
import com.utm.mission.model.MissionExecution;
import com.utm.mission.model.MissionExecutionLeg;
import com.utm.mission.model.Waypoint;
import com.utm.mission.model.enumeration.ExecutionMode;
import com.utm.mission.model.enumeration.ExecutionStatus;
import com.utm.mission.model.enumeration.LegStatus;
import com.utm.mission.model.enumeration.MissionScheduleType;
import com.utm.mission.model.enumeration.MissionStatus;
import com.utm.mission.model.enumeration.StopoverType;
import com.utm.mission.model.enumeration.WaypointType;
import com.utm.mission.repository.MissionExecutionLegRepository;
import com.utm.mission.repository.MissionExecutionRepository;
import com.utm.mission.repository.MissionRepository;
import com.utm.mission.repository.WaypointRepository;
import com.utm.mission.service.client.AirspaceClientService;
import com.utm.mission.service.client.DroneClientService;
import com.utm.mission.service.client.FlightClientService;
import com.utm.mission.service.client.HubClientService;
import com.utm.mission.service.fleet.FleetScoringService;
import com.utm.mission.util.MissionLegUtils;
import com.utm.mission.util.MissionRouteSplitter;
import com.utm.mission.viewmodel.client.DroneBriefVm;
import com.utm.mission.viewmodel.client.FlightBriefVm;
import com.utm.mission.viewmodel.client.FlightCreateRequestVm;
import com.utm.mission.viewmodel.client.FlightWaypointPayloadVm;
import com.utm.mission.viewmodel.client.HubBriefVm;
import com.utm.mission.viewmodel.execution.LegDroneAssignmentVm;
import com.utm.mission.viewmodel.execution.MissionExecutePostVm;
import com.utm.mission.viewmodel.execution.MissionExecutionAbortPostVm;
import com.utm.mission.viewmodel.execution.MissionExecutionLegVm;
import com.utm.mission.viewmodel.execution.MissionExecutionPlanVm;
import com.utm.mission.viewmodel.execution.MissionExecutionReassignLegPostVm;
import com.utm.mission.viewmodel.execution.MissionExecutionResultVm;
import com.utm.mission.viewmodel.execution.MissionExecutionVm;
import com.utm.mission.viewmodel.execution.PlannedLegVm;
import com.utm.mission.viewmodel.fleet.ScoredDroneCandidateVm;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Supplier;

@Service
@Slf4j
public class MissionExecutionServiceImpl implements MissionExecutionService {

    private static final double DEFAULT_USABLE_WH = MissionLegUtils.DEFAULT_BATTERY_CAPACITY_WH
            * (1.0 - MissionLegUtils.RESERVE_FRACTION);

    private final MissionRepository missionRepository;
    private final WaypointRepository waypointRepository;
    private final MissionExecutionRepository missionExecutionRepository;
    private final MissionExecutionMapper missionExecutionMapper;
    private final DroneClientService droneClientService;
    private final FlightClientService flightClientService;
    private final FleetScoringService fleetScoringService;
    private final MissionExecutionLegRepository missionExecutionLegRepository;
    private final HubClientService hubClientService;
    private final AirspaceClientService airspaceClientService;
    private final TransactionTemplate transactionTemplate;

    @Autowired
    public MissionExecutionServiceImpl(
            MissionRepository missionRepository,
            WaypointRepository waypointRepository,
            MissionExecutionRepository missionExecutionRepository,
            MissionExecutionMapper missionExecutionMapper,
            DroneClientService droneClientService,
            FlightClientService flightClientService,
            FleetScoringService fleetScoringService,
            @Autowired(required = false) MissionExecutionLegRepository missionExecutionLegRepository,
            @Autowired(required = false) HubClientService hubClientService,
            @Autowired(required = false) AirspaceClientService airspaceClientService,
            @Autowired(required = false) TransactionTemplate transactionTemplate) {
        this.missionRepository = missionRepository;
        this.waypointRepository = waypointRepository;
        this.missionExecutionRepository = missionExecutionRepository;
        this.missionExecutionMapper = missionExecutionMapper;
        this.droneClientService = droneClientService;
        this.flightClientService = flightClientService;
        this.fleetScoringService = fleetScoringService;
        this.missionExecutionLegRepository = missionExecutionLegRepository;
        this.hubClientService = hubClientService;
        this.airspaceClientService = airspaceClientService;
        this.transactionTemplate = transactionTemplate;
    }

    @Override
    @Transactional(readOnly = true)
    public MissionExecutionPlanVm getExecutionPlan(String missionId) {
        return getExecutionPlan(missionId, false);
    }

    @Override
    @Transactional(readOnly = true)
    public MissionExecutionPlanVm getExecutionPlan(String missionId, boolean autoSplitByRange) {
        Mission mission = missionRepository.findById(missionId)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, "id", missionId));

        List<Waypoint> waypoints = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
        if (waypoints.size() < 2 || isEmptySameHubLoop(mission, waypoints)) {
            throw new BadRequestException(MessageCode.MISSION_WAYPOINTS_LESS_THAN_TWO,
                    "Mission must have at least 2 distinct route waypoints to plan execution");
        }

        Map<String, HubBriefVm> hubMap = fetchRelevantHubs(mission, waypoints);
        List<HubBriefVm> activeHubs = hubClientService != null ? hubClientService.getActiveHubs() : List.of();
        if (autoSplitByRange && !activeHubs.isEmpty()) {
            DroneBriefVm refDrone = resolveReferenceDroneForPlanSplit(mission);
            MissionRouteSplitter.RoutePlanResult splitResult = MissionRouteSplitter.planWaypointsWithHubs(
                    mission, waypoints, hubMap, activeHubs, refDrone, StopoverType.RECHARGE, 1.0);
            waypoints = splitResult.plannedWaypoints();
            hubMap = splitResult.enrichedHubMap();
        }
        List<MissionLegUtils.PlannedLegSpec> legSpecs = MissionLegUtils.decomposeIntoLegs(mission, waypoints, hubMap);

        List<PlannedLegVm> plannedLegs = new ArrayList<>();
        List<String> globalWarnings = new ArrayList<>();
        double totalDistance = 0.0;
        long totalDurationSec = 0L;
        double totalEnergyWh = 0.0;
        boolean allFeasible = true;
        boolean hasRelayHandoff = false;

        List<MissionLegUtils.BatteryCycleSegment> batterySegments =
                MissionLegUtils.calculateCumulativeBatterySegments(legSpecs, null, 1.0);
        for (MissionLegUtils.BatteryCycleSegment seg : batterySegments) {
            if (seg.legIndices().size() > 1 && seg.cumulativeEnergyWh() > DEFAULT_USABLE_WH) {
                globalWarnings.add(String.format(
                        "Consecutive non-charging legs %d-%d require %.1f Wh cumulative (> %.1f Wh default usable); add a RECHARGE/BATTERY_SWAP hub stopover or call /waypoints/auto-plan-hubs",
                        seg.startLegIndex() + 1, seg.endLegIndex() + 1, seg.cumulativeEnergyWh(), DEFAULT_USABLE_WH));
            }
        }

        for (MissionLegUtils.PlannedLegSpec leg : legSpecs) {
            if (leg.stopoverType() == StopoverType.RELAY_HANDOFF) {
                hasRelayHandoff = true;
            }
            HubBriefVm depHub = hubMap.get(leg.departureHubId());
            HubBriefVm arrHub = hubMap.get(leg.arrivalHubId());

            List<double[]> anchoredPath = MissionLegUtils.buildAnchoredCoordinates(leg.waypoints(), depHub, arrHub);
            List<String> airspaceWarnings = airspaceClientService != null
                    ? airspaceClientService.checkPathSafety(anchoredPath)
                    : List.of();
            boolean airspaceSafe = airspaceWarnings.isEmpty();
            if (!airspaceSafe) {
                allFeasible = false;
                globalWarnings.add("Leg " + (leg.legIndex() + 1) + " has restricted airspace violations");
            }

            List<ScoredDroneCandidateVm> candidates = fleetScoringService.scoreCandidateDronesForLeg(leg);
            boolean hasEligibleDrone = candidates.stream().anyMatch(ScoredDroneCandidateVm::eligible);

            List<HubBriefVm> recommendedChargingHubs = List.of();
            if (!hasEligibleDrone && leg.estimatedEnergyWh() > DEFAULT_USABLE_WH) {
                if (depHub != null && arrHub != null && depHub.latitude() != null && arrHub.latitude() != null) {
                    recommendedChargingHubs = MissionRouteSplitter.findHubChainDijkstra(
                            depHub.id(), depHub.latitude(), depHub.longitude(),
                            arrHub.id(), arrHub.latitude(), arrHub.longitude(),
                            0.0, leg.payloadWeightKg(), DEFAULT_USABLE_WH, null, 1.0, activeHubs);
                }
                if (recommendedChargingHubs.isEmpty()) {
                    recommendedChargingHubs = MissionLegUtils.findRecommendedChargingHubs(
                            depHub, arrHub, leg.payloadWeightKg(), DEFAULT_USABLE_WH, activeHubs);
                }
                globalWarnings.add("Leg " + (leg.legIndex() + 1)
                        + " exceeds single-charge battery range; call POST /waypoints/auto-plan-hubs or enable autoSplitByRange");
            }
            if (!hasEligibleDrone) {
                allFeasible = false;
            }

            long legDurationSec = MissionLegUtils.computeLegDurationSeconds(leg, null, hubMap);
            totalDistance += leg.distanceMeters();
            totalDurationSec += legDurationSec + (leg.groundTimeMinutes() * 60L);
            totalEnergyWh += leg.estimatedEnergyWh();

            plannedLegs.add(new PlannedLegVm(
                    leg.legIndex(),
                    leg.departureHubId(),
                    depHub != null ? depHub.name() : null,
                    leg.arrivalHubId(),
                    arrHub != null ? arrHub.name() : null,
                    leg.stopoverType(),
                    leg.groundTimeMinutes(),
                    leg.distanceMeters(),
                    legDurationSec,
                    leg.payloadWeightKg(),
                    leg.estimatedEnergyWh(),
                    airspaceSafe,
                    airspaceWarnings,
                    candidates,
                    recommendedChargingHubs));
        }

        ExecutionMode recommendedMode = hasRelayHandoff
                ? ExecutionMode.MULTI_DRONE_RELAY
                : ExecutionMode.SAME_DRONE_SEQUENTIAL;

        return new MissionExecutionPlanVm(
                mission.getId(),
                mission.getName(),
                recommendedMode,
                plannedLegs.size(),
                Math.round(totalDistance * 100.0) / 100.0,
                totalDurationSec,
                Math.round(totalEnergyWh * 10.0) / 10.0,
                allFeasible,
                globalWarnings,
                plannedLegs);
    }

    @Override
    public MissionExecutionResultVm executeMission(String missionId, MissionExecutePostVm postVm) {
        return executeMissionInternal(missionId, postVm, "MANUAL");
    }

    public MissionExecutionResultVm executeScheduledMission(String missionId, String pilotId) {
        return executeScheduledMission(missionId, null, pilotId);
    }

    public MissionExecutionResultVm executeScheduledMission(String missionId, String droneId, String pilotId) {
        boolean hasPreAssignedDrone = droneId != null && !droneId.isBlank();
        MissionExecutePostVm postVm = new MissionExecutePostVm(
                hasPreAssignedDrone ? droneId.trim() : null,
                pilotId,
                !hasPreAssignedDrone,
                ExecutionMode.SAME_DRONE_SEQUENTIAL,
                null,
                false);
        return executeMissionInternal(missionId, postVm, "SCHEDULED");
    }

    private MissionExecutionResultVm executeMissionInternal(
            String missionId,
            MissionExecutePostVm postVm,
            String triggerType) {
        record LoadedMission(Mission mission, List<Waypoint> waypoints, MissionStatus previousStatus) {
        }

        LoadedMission loaded = runInTransaction(() -> {
            Mission m = missionRepository.findById(missionId)
                    .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, "id", missionId));

            if (m.getStatus() == MissionStatus.EXECUTING || m.getStatus() == MissionStatus.PAUSED) {
                throw new BadRequestException(MessageCode.CANNOT_EDIT_EXECUTING_MISSION,
                        "Mission is already executing or paused");
            }

            List<Waypoint> wps = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
            if (wps.size() < 2 || isEmptySameHubLoop(m, wps)) {
                throw new BadRequestException(MessageCode.MISSION_WAYPOINTS_LESS_THAN_TWO,
                        "Mission must have at least 2 distinct route waypoints to execute");
            }
            return new LoadedMission(m, wps, m.getStatus());
        });

        Mission mission = loaded.mission();
        MissionStatus previousStatus = loaded.previousStatus();
        List<Waypoint> waypoints = loaded.waypoints();

        Map<String, HubBriefVm> hubMap = fetchRelevantHubs(mission, waypoints);
        if (Boolean.TRUE.equals(postVm.autoSplitByRange()) && hubClientService != null) {
            DroneBriefVm refDrone = resolveReferenceDroneForSplit(mission, postVm);
            List<HubBriefVm> activeHubs = hubClientService.getActiveHubs();
            if (!activeHubs.isEmpty()) {
                StopoverType splitStopover = postVm.executionMode() == ExecutionMode.MULTI_DRONE_RELAY
                        ? StopoverType.RELAY_HANDOFF
                        : StopoverType.RECHARGE;
                MissionRouteSplitter.RoutePlanResult splitResult = MissionRouteSplitter.planWaypointsWithHubs(
                        mission, waypoints, hubMap, activeHubs, refDrone, splitStopover, 1.0);
                waypoints = splitResult.plannedWaypoints();
                hubMap = splitResult.enrichedHubMap();
            }
        }

        List<MissionLegUtils.PlannedLegSpec> legs = MissionLegUtils.decomposeIntoLegs(mission, waypoints, hubMap);
        ExecutionMode mode = resolveExecutionMode(postVm, legs);

        ZonedDateTime initialDepartureTime = mission.getScheduledAt() != null
                && mission.getScheduledAt().isAfter(ZonedDateTime.now())
                        ? mission.getScheduledAt()
                        : ZonedDateTime.now();

        ResolvedAssignments resolvedAssignments = resolveLegDroneAssignments(
                mission, postVm, mode, legs, hubMap, initialDepartureTime);
        Map<Integer, String> legDroneIds = resolvedAssignments.legDroneIds();
        Map<Integer, DroneBriefVm> legDrones = resolvedAssignments.legDrones();
        String primaryDroneId = legDroneIds.getOrDefault(0, postVm.droneId());
        List<MissionLegUtils.PlannedLegSpec> finalLegs = legs;

        // Transaction 2: Atomically lock Mission -> EXECUTING (with @Version) & persist MissionExecution BEFORE flight creation
        MissionExecution savedExecution = runInTransaction(() -> {
            mission.setStatus(MissionStatus.EXECUTING);
            missionRepository.saveAndFlush(mission);

            MissionExecution execution = missionExecutionMapper.toEntity(postVm, missionId);
            execution.setPilotId(postVm.pilotId() != null ? postVm.pilotId().trim() : null);
            execution.setExecutionMode(mode);
            execution.setPrimaryDroneId(primaryDroneId);
            execution.setCurrentLegIndex(0);
            execution.setTotalLegs(finalLegs.size());
            execution.setCompletedLegs(0);
            execution.setCurrentWaypointIndex(0);
            execution.setCompletedWaypoints(0);
            if (execution.getWaypointLogs() == null) {
                execution.setWaypointLogs(new ArrayList<>());
            }
            execution.setTriggerType(triggerType);
            return missionExecutionRepository.saveAndFlush(execution);
        });

        record CreatedLegFlight(MissionLegUtils.PlannedLegSpec leg, FlightBriefVm flight, String droneId) {
        }

        List<FlightBriefVm> createdFlights = new ArrayList<>();
        List<CreatedLegFlight> createdLegFlights = new ArrayList<>();
        String previousFlightId = null;
        int requiredTurnaroundBeforeLeg = 0;

        DroneBriefVm primaryDrone = legDrones.get(0);
        Map<Integer, Double> sequentialExpectedBatteryPcts = mode == ExecutionMode.SAME_DRONE_SEQUENTIAL
                ? MissionLegUtils.computeExpectedInitialBatteryPcts(finalLegs, primaryDrone, 1.0)
                : Map.of();

        ZonedDateTime currentDepartureTime = initialDepartureTime;

        try {
            for (MissionLegUtils.PlannedLegSpec leg : finalLegs) {
                String assignedDroneId = legDroneIds.get(leg.legIndex());
                DroneBriefVm assignedDrone = legDrones.get(leg.legIndex());
                long flightDurationSeconds = MissionLegUtils.computeLegDurationSeconds(leg, assignedDrone, hubMap);
                ZonedDateTime scheduledArrival = currentDepartureTime.plusSeconds(flightDurationSeconds);

                Double cruisingAlt = extractCruisingAltitude(leg.waypoints());
                List<FlightWaypointPayloadVm> flightWaypoints = leg.waypoints().stream()
                        .map(this::toFlightWaypointPayload)
                        .toList();

                Double expectedInitialBatteryPct;
                if (mode == ExecutionMode.SAME_DRONE_SEQUENTIAL) {
                    expectedInitialBatteryPct = sequentialExpectedBatteryPcts.get(leg.legIndex());
                } else {
                    expectedInitialBatteryPct = assignedDrone != null && assignedDrone.currentBatteryPct() != null
                            ? assignedDrone.currentBatteryPct()
                            : 100.0;
                }

                String flightNumber = BusinessCodeGenerator.generate(CodePatternRule.FLIGHT_NUMBER);
                String notes = String.format("Generated from mission: %s (Leg %d/%d, mode=%s)",
                        mission.getName(), leg.legIndex() + 1, finalLegs.size(), mode.getValue());

                FlightCreateRequestVm flightReq = new FlightCreateRequestVm(
                        flightNumber,
                        assignedDroneId,
                        leg.departureHubId(),
                        leg.arrivalHubId(),
                        postVm.pilotId().trim(),
                        currentDepartureTime,
                        scheduledArrival,
                        cruisingAlt,
                        notes,
                        savedExecution.getId(),
                        flightWaypoints,
                        missionId,
                        leg.legIndex(),
                        finalLegs.size(),
                        previousFlightId,
                        leg.payloadWeightKg(),
                        expectedInitialBatteryPct,
                        requiredTurnaroundBeforeLeg,
                        leg.stopoverType() != null ? leg.stopoverType().getValue() : StopoverType.NONE.getValue());

                FlightBriefVm flightVm = flightClientService.createFlight(flightReq)
                        .orElseThrow(() -> new BadRequestException(MessageCode.FLIGHT_CREATION_FAILED,
                                "flightNumber", flightNumber));

                createdFlights.add(flightVm);
                createdLegFlights.add(new CreatedLegFlight(leg, flightVm, assignedDroneId));

                previousFlightId = flightVm.id();
                int turnaroundMinutes = leg.stopoverType() == StopoverType.NONE
                        ? 0
                        : Math.max(0, leg.groundTimeMinutes());
                requiredTurnaroundBeforeLeg = turnaroundMinutes;
                currentDepartureTime = scheduledArrival.plusMinutes(turnaroundMinutes);
                log.info("Created flight {} for mission {} (Leg {}/{}, drone={}, turnaround={}m)",
                        flightNumber, missionId, leg.legIndex() + 1, finalLegs.size(), assignedDroneId, turnaroundMinutes);
            }
        } catch (RuntimeException ex) {
            if (!createdFlights.isEmpty()) {
                log.warn(
                        "Saga rollback triggered for mission {} execution {}: aborting {} previously created leg flight(s)",
                        missionId, savedExecution.getId(), createdFlights.size());
                for (FlightBriefVm created : createdFlights) {
                    if (created.id() != null) {
                        flightClientService.abortFlight(created.id(),
                                "Saga compensation: downstream leg creation failed");
                    }
                }
            }
            runInTransaction(() -> {
                missionExecutionRepository.delete(savedExecution);
                mission.setStatus(previousStatus);
                missionRepository.saveAndFlush(mission);
                return null;
            });
            throw ex;
        }

        List<MissionExecutionLeg> persistedLegs = runInTransaction(() -> {
            List<MissionExecutionLeg> saved = new ArrayList<>();
            if (missionExecutionLegRepository != null) {
                for (CreatedLegFlight item : createdLegFlights) {
                    MissionLegUtils.PlannedLegSpec leg = item.leg();
                    MissionExecutionLeg legEntity = missionExecutionMapper.toLegEntity(
                            savedExecution.getId(),
                            leg.legIndex(),
                            item.flight().id(),
                            item.droneId(),
                            leg.departureHubId(),
                            leg.arrivalHubId(),
                            leg.stopoverType(),
                            leg.groundTimeMinutes(),
                            leg.estimatedEnergyWh());
                    if (legEntity != null) {
                        saved.add(missionExecutionLegRepository.saveAndFlush(legEntity));
                    }
                }
            }
            return saved;
        });

        log.info("Mission ID: {} executed successfully with {} flight leg(s) in {} mode. Execution ID: {}",
                missionId, createdFlights.size(), mode, savedExecution.getId());

        MissionExecutionVm executionVm = toExecutionVm(savedExecution, persistedLegs);
        FlightBriefVm primaryFlight = createdFlights.isEmpty() ? null : createdFlights.getFirst();
        return new MissionExecutionResultVm(executionVm, primaryFlight, createdFlights);
    }

    private FlightWaypointPayloadVm toFlightWaypointPayload(Waypoint wp) {
        Map<String, Object> actions = wp.getActions() != null ? new HashMap<>(wp.getActions()) : null;
        if (wp.getHoverDurationSec() != null && wp.getHoverDurationSec() > 0) {
            if (actions == null) {
                actions = new HashMap<>();
            }
            if (!actions.containsKey("durationS") && !actions.containsKey("hoverDurationSec")) {
                actions.put("durationS", wp.getHoverDurationSec());
            }
        }
        WaypointType wpType = wp.getWaypointType() != null
                ? wp.getWaypointType()
                : (wp.getHubId() != null && !wp.getHubId().isBlank() ? WaypointType.HUB : WaypointType.COORDINATE);
        return new FlightWaypointPayloadVm(
                wp.getSequence(),
                wp.getName(),
                wp.getLatitude(),
                wp.getLongitude(),
                wp.getAltitude() != null ? wp.getAltitude() : (wpType == WaypointType.HUB ? 0.0 : 50.0),
                actions,
                wp.getConditions(),
                wpType.getValue(),
                wp.getHubId(),
                wp.getStopoverType() != null ? wp.getStopoverType().getValue() : StopoverType.NONE.getValue(),
                wp.getSpeedToWaypoint(),
                wp.getHeadingAtWaypoint(),
                wp.getTurnRadius(),
                wp.getHoverDurationSec() != null ? wp.getHoverDurationSec() : 0,
                Boolean.TRUE.equals(wp.getWaitForConfirmation()),
                wp.getPayloadDeltaKg() != null ? wp.getPayloadDeltaKg() : 0.0);
    }

    private Double extractCruisingAltitude(List<Waypoint> waypoints) {
        if (waypoints == null || waypoints.isEmpty()) {
            return MissionLegUtils.DEFAULT_CRUISING_ALTITUDE_AGL;
        }
        return waypoints.stream()
                .map(Waypoint::getAltitude)
                .filter(Objects::nonNull)
                .filter(alt -> alt > 0.0)
                .mapToDouble(Double::doubleValue)
                .max()
                .orElse(MissionLegUtils.DEFAULT_CRUISING_ALTITUDE_AGL);
    }

    private <T> T runInTransaction(Supplier<T> action) {
        if (transactionTemplate == null) {
            return action.get();
        }
        return transactionTemplate.execute(status -> action.get());
    }

    @Override
    @Transactional(readOnly = true)
    public MissionExecutionVm getExecutionById(String id) {
        MissionExecution execution = missionExecutionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_EXECUTION_NOT_FOUND, "id", id));
        List<MissionExecutionLeg> legs = missionExecutionLegRepository != null
                ? missionExecutionLegRepository.findByExecutionIdOrderByLegIndexAsc(id)
                : List.of();
        return toExecutionVm(execution, legs);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MissionExecutionVm> getExecutionsByMissionId(String missionId) {
        List<MissionExecution> executions = missionExecutionRepository.findByMissionIdOrderByStartedAtDesc(missionId);
        if (missionExecutionLegRepository == null) {
            return missionExecutionMapper.toVmList(executions);
        }
        return executions.stream()
                .map(exec -> toExecutionVm(exec,
                        missionExecutionLegRepository.findByExecutionIdOrderByLegIndexAsc(exec.getId())))
                .toList();
    }

    @Override
    @Transactional
    public MissionExecutionVm pauseExecution(String executionId) {
        MissionExecution execution = lockExecution(executionId)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_EXECUTION_NOT_FOUND, "id", executionId));

        if (execution.getStatus() != ExecutionStatus.IN_PROGRESS) {
            throw new BadRequestException(MessageCode.MISSION_EXECUTION_INVALID_STATE,
                    "Only IN_PROGRESS executions can be paused");
        }

        List<MissionExecutionLeg> legs = missionExecutionLegRepository != null
                ? missionExecutionLegRepository.findByExecutionIdOrderByLegIndexAsc(executionId)
                : List.of();

        for (MissionExecutionLeg leg : legs) {
            if (leg.getStatus() == LegStatus.ACTIVE && leg.getDroneId() != null) {
                droneClientService.sendDroneCommand(leg.getDroneId(), "HOVER", leg.getFlightId(),
                        "{\"reason\":\"Mission execution paused by operator\"}");
            }
        }

        execution.setStatus(ExecutionStatus.PAUSED);
        execution.setPausedAt(ZonedDateTime.now());
        missionExecutionRepository.saveAndFlush(execution);

        missionRepository.findById(execution.getMissionId()).ifPresent(mission -> {
            mission.setStatus(MissionStatus.PAUSED);
            missionRepository.saveAndFlush(mission);
        });

        log.info("Paused mission execution {} (mission {})", executionId, execution.getMissionId());
        return toExecutionVm(execution, legs);
    }

    @Override
    @Transactional
    public MissionExecutionVm resumeExecution(String executionId) {
        MissionExecution execution = lockExecution(executionId)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_EXECUTION_NOT_FOUND, "id", executionId));

        if (execution.getStatus() != ExecutionStatus.PAUSED) {
            throw new BadRequestException(MessageCode.MISSION_EXECUTION_INVALID_STATE,
                    "Only PAUSED executions can be resumed");
        }

        List<MissionExecutionLeg> legs = missionExecutionLegRepository != null
                ? missionExecutionLegRepository.findByExecutionIdOrderByLegIndexAsc(executionId)
                : List.of();

        for (MissionExecutionLeg leg : legs) {
            if (leg.getStatus() == LegStatus.ACTIVE && leg.getDroneId() != null) {
                droneClientService.sendDroneCommand(leg.getDroneId(), "RESUME", leg.getFlightId(),
                        "{\"reason\":\"Mission execution resumed by operator\"}");
            }
        }

        execution.setStatus(ExecutionStatus.IN_PROGRESS);
        execution.setPausedAt(null);
        missionExecutionRepository.saveAndFlush(execution);

        missionRepository.findById(execution.getMissionId()).ifPresent(mission -> {
            mission.setStatus(MissionStatus.EXECUTING);
            missionRepository.saveAndFlush(mission);
        });

        log.info("Resumed mission execution {} (mission {})", executionId, execution.getMissionId());
        return toExecutionVm(execution, legs);
    }

    @Override
    public MissionExecutionVm abortExecution(String executionId, MissionExecutionAbortPostVm abortVm) {
        String reason = (abortVm != null && abortVm.reason() != null && !abortVm.reason().isBlank())
                ? abortVm.reason().trim()
                : "Aborted by operator";

        record AbortPlan(MissionExecutionVm vm, List<String> flightIdsToAbort) {}

        // Commit ABORTED state BEFORE calling flightService.abortFlight over HTTP so returning
        // Kafka FLIGHT_CANCELLED events cannot deadlock against open row locks on mission_execution_leg.
        java.util.function.Supplier<AbortPlan> markAbortedTx = () -> {
            MissionExecution execution = lockExecution(executionId)
                    .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_EXECUTION_NOT_FOUND, "id", executionId));

            if (execution.getStatus() == ExecutionStatus.COMPLETED
                    || execution.getStatus() == ExecutionStatus.ABORTED) {
                throw new BadRequestException(MessageCode.MISSION_EXECUTION_INVALID_STATE,
                        "Cannot abort an already completed or aborted execution");
            }

            List<MissionExecutionLeg> legs = missionExecutionLegRepository != null
                    ? missionExecutionLegRepository.findByExecutionIdOrderByLegIndexAsc(executionId)
                    : List.of();

            List<String> flightIds = new ArrayList<>();
            for (MissionExecutionLeg leg : legs) {
                if (leg.getStatus() == LegStatus.PLANNED
                        || leg.getStatus() == LegStatus.AUTHORIZED
                        || leg.getStatus() == LegStatus.ACTIVE
                        || leg.getStatus() == LegStatus.DIVERTED) {
                    if (leg.getFlightId() != null && !leg.getFlightId().isBlank()) {
                        flightIds.add(leg.getFlightId());
                    }
                    leg.setStatus(leg.getStatus() == LegStatus.ACTIVE || leg.getStatus() == LegStatus.DIVERTED
                            ? LegStatus.EMERGENCY_LANDING
                            : LegStatus.CANCELLED);
                    if (missionExecutionLegRepository != null) {
                        missionExecutionLegRepository.save(leg);
                    }
                }
            }

            execution.setStatus(ExecutionStatus.ABORTED);
            execution.setAbortReason(reason);
            execution.setCompletedAt(ZonedDateTime.now());
            missionExecutionRepository.saveAndFlush(execution);

            missionRepository.findById(execution.getMissionId()).ifPresent(mission -> {
                mission.setStatus(MissionStatus.ABORTED);
                missionRepository.saveAndFlush(mission);
            });

            log.warn("Aborted mission execution {} (mission {}): {}", executionId, execution.getMissionId(), reason);
            return new AbortPlan(toExecutionVm(execution, legs), flightIds);
        };

        AbortPlan plan = transactionTemplate != null
                ? transactionTemplate.execute(status -> markAbortedTx.get())
                : markAbortedTx.get();

        if (plan != null) {
            for (String flightId : plan.flightIdsToAbort()) {
                flightClientService.abortFlight(flightId, reason);
            }
            return plan.vm();
        }
        throw new NotFoundException(MessageCode.MISSION_EXECUTION_NOT_FOUND, "id", executionId);
    }

    @Override
    @Transactional
    public MissionExecutionVm reassignLegDrone(
            String executionId,
            int legIndex,
            MissionExecutionReassignLegPostVm reassignVm) {
        MissionExecution execution = lockExecution(executionId)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_EXECUTION_NOT_FOUND, "id", executionId));

        if (execution.getStatus() == ExecutionStatus.COMPLETED
                || execution.getStatus() == ExecutionStatus.ABORTED
                || execution.getStatus() == ExecutionStatus.FAILED) {
            throw new BadRequestException(MessageCode.MISSION_EXECUTION_INVALID_STATE,
                    "Cannot reassign drone on a finished mission execution");
        }

        if (missionExecutionLegRepository == null) {
            throw new NotFoundException(MessageCode.EXECUTION_LEG_NOT_FOUND, "legIndex", String.valueOf(legIndex));
        }

        MissionExecutionLeg leg = missionExecutionLegRepository.findByExecutionIdAndLegIndex(executionId, legIndex)
                .orElseThrow(() -> new NotFoundException(MessageCode.EXECUTION_LEG_NOT_FOUND,
                        "legIndex", String.valueOf(legIndex)));

        boolean isIncidentRecovery = leg.getStatus() == LegStatus.CANCELLED
                || leg.getStatus() == LegStatus.EMERGENCY_LANDING
                || leg.getStatus() == LegStatus.DIVERTED;

        if (leg.getStatus() != LegStatus.PLANNED && leg.getStatus() != LegStatus.AUTHORIZED && !isIncidentRecovery) {
            throw new BadRequestException(MessageCode.MISSION_EXECUTION_INVALID_STATE,
                    "Only PLANNED, AUTHORIZED, or failed/incident legs can be reassigned to a replacement drone");
        }

        String newDroneId = reassignVm.droneId().trim();
        DroneBriefVm drone = droneClientService.getDroneById(newDroneId)
                .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id", newDroneId));
        Mission mission = missionRepository.findById(execution.getMissionId()).orElse(null);
        double requiredPayloadKg = mission != null && mission.getPayloadWeightKg() != null
                ? mission.getPayloadWeightKg()
                : 0.0;
        validateDroneAvailability(drone, newDroneId, requiredPayloadKg);

        if (drone.currentHubId() != null && !drone.currentHubId().isBlank()
                && leg.getDepartureHubId() != null && !leg.getDepartureHubId().equals(drone.currentHubId())) {
            throw new BadRequestException(MessageCode.DRONE_NOT_AT_DEPARTURE_HUB,
                    "droneHubId", drone.currentHubId(),
                    "departureHubId", leg.getDepartureHubId());
        }

        List<MissionExecutionLeg> allLegs = missionExecutionLegRepository
                .findByExecutionIdOrderByLegIndexAsc(executionId);

        if (isIncidentRecovery) {
            // Spawn a fresh recovery Flight for this leg and relink downstream dependsOnFlightId!
            String prevFlightId = null;
            if (legIndex > 0) {
                for (MissionExecutionLeg candidate : allLegs) {
                    if (candidate.getLegIndex() == legIndex - 1 && candidate.getStatus() == LegStatus.COMPLETED) {
                        prevFlightId = candidate.getFlightId();
                        break;
                    }
                }
            }

            List<Waypoint> missionWps = waypointRepository.findByMissionIdOrderBySequenceAsc(execution.getMissionId());
            Map<String, HubBriefVm> hubMap = mission != null ? fetchRelevantHubs(mission, missionWps) : Map.of();
            List<MissionLegUtils.PlannedLegSpec> specs = mission != null
                    ? MissionLegUtils.decomposeIntoLegs(mission, missionWps, hubMap)
                    : List.of();
            List<Waypoint> legWps = legIndex < specs.size() ? specs.get(legIndex).waypoints() : missionWps;
            long durationSec = legIndex < specs.size()
                    ? MissionLegUtils.computeLegDurationSeconds(specs.get(legIndex), drone, hubMap)
                    : 600L;

            ZonedDateTime depTime = ZonedDateTime.now().plusMinutes(2);
            ZonedDateTime arrTime = depTime.plusSeconds(durationSec);
            String flightNumber = BusinessCodeGenerator.generate(CodePatternRule.FLIGHT_NUMBER);
            String pilotId = execution.getPilotId() != null && !execution.getPilotId().isBlank()
                    ? execution.getPilotId()
                    : "SYSTEM_RECOVERY";

            FlightCreateRequestVm recoveryReq = new FlightCreateRequestVm(
                    flightNumber,
                    newDroneId,
                    leg.getDepartureHubId(),
                    leg.getArrivalHubId(),
                    pilotId,
                    depTime,
                    arrTime,
                    extractCruisingAltitude(legWps),
                    "Recovery flight for leg " + (legIndex + 1) + " of execution " + executionId,
                    executionId,
                    legWps.stream().map(this::toFlightWaypointPayload).toList(),
                    execution.getMissionId(),
                    legIndex,
                    execution.getTotalLegs(),
                    prevFlightId,
                    requiredPayloadKg,
                    drone.currentBatteryPct() != null ? drone.currentBatteryPct() : 100.0,
                    0,
                    leg.getStopoverType() != null ? leg.getStopoverType().getValue() : StopoverType.NONE.getValue());

            FlightBriefVm recoveryFlight = flightClientService.createFlight(recoveryReq)
                    .orElseThrow(() -> new BadRequestException(MessageCode.FLIGHT_CREATION_FAILED,
                            "flightNumber", flightNumber));

            leg.setFlightId(recoveryFlight.id());
            leg.setDroneId(newDroneId);
            leg.setStatus(LegStatus.PLANNED);
            missionExecutionLegRepository.saveAndFlush(leg);

            // Re-link next leg's dependsOnFlightId to the new recovery flight
            for (MissionExecutionLeg nextLeg : allLegs) {
                if (nextLeg.getLegIndex() == legIndex + 1
                        && (nextLeg.getStatus() == LegStatus.PLANNED || nextLeg.getStatus() == LegStatus.AUTHORIZED)
                        && nextLeg.getFlightId() != null && !nextLeg.getFlightId().isBlank()) {
                    flightClientService.updateFlightLegPlan(
                            nextLeg.getFlightId(),
                            Map.of("dependsOnFlightId", recoveryFlight.id()));
                    break;
                }
            }

            execution.setErrorMessage(null);
            missionExecutionRepository.saveAndFlush(execution);
            log.info("Created recovery flight {} for failed leg {} of execution {} with replacement drone {}",
                    recoveryFlight.id(), legIndex, executionId, newDroneId);
        } else {
            if (leg.getFlightId() != null && !leg.getFlightId().isBlank()) {
                boolean updated = flightClientService.reassignFlightDrone(leg.getFlightId(), newDroneId);
                if (!updated) {
                    throw new BadRequestException(MessageCode.FLIGHT_CREATION_FAILED,
                            "Failed to update drone assignment in flight service for flight " + leg.getFlightId());
                }
            }

            leg.setDroneId(newDroneId);
            if (leg.getStatus() == LegStatus.AUTHORIZED) {
                leg.setStatus(LegStatus.PLANNED);
            }
            missionExecutionLegRepository.saveAndFlush(leg);
        }

        if (legIndex == 0) {
            execution.setPrimaryDroneId(newDroneId);
            missionExecutionRepository.saveAndFlush(execution);
        }

        List<MissionExecutionLeg> refreshedLegs = missionExecutionLegRepository
                .findByExecutionIdOrderByLegIndexAsc(executionId);
        log.info("Reassigned leg {} of execution {} to replacement drone {}", legIndex, executionId, newDroneId);
        return toExecutionVm(execution, refreshedLegs);
    }

    private Optional<MissionExecution> lockExecution(String executionId) {
        Optional<MissionExecution> locked = missionExecutionRepository.findByIdForUpdate(executionId);
        return locked.isPresent() ? locked : missionExecutionRepository.findById(executionId);
    }

    private boolean isEmptySameHubLoop(Mission mission, List<Waypoint> waypoints) {
        if (mission == null || waypoints == null || mission.getDepartureHubId() == null) {
            return false;
        }
        if (!mission.getDepartureHubId().equals(mission.getArrivalHubId())) {
            return false;
        }
        return waypoints.size() <= 2
                && waypoints.stream().allMatch(w -> w.getWaypointType() == WaypointType.HUB
                        && (w.getStopoverType() == null || w.getStopoverType() == StopoverType.NONE));
    }

    @Override
    @Transactional
    public void handleFlightLifecycleEvent(FlightLifecycleEvent event) {
        if (event == null || event.eventType() == null) {
            return;
        }
        String executionId = event.executionId();
        MissionExecutionLeg leg = null;
        if (missionExecutionLegRepository != null && event.flightId() != null) {
            leg = missionExecutionLegRepository.findByFlightId(event.flightId()).orElse(null);
            if (leg != null && (executionId == null || executionId.isBlank())) {
                executionId = leg.getExecutionId();
            }
        }
        if (executionId == null || executionId.isBlank()) {
            return;
        }

        // Always lock parent mission_execution row first to prevent cross-table row lock deadlocks
        // with concurrent HTTP abort/pause/resume/reassign transactions.
        Optional<MissionExecution> execOpt = lockExecution(executionId);
        if (execOpt.isEmpty()) {
            return;
        }
        if (missionExecutionLegRepository != null && event.flightId() != null) {
            leg = missionExecutionLegRepository.findByFlightId(event.flightId()).orElse(leg);
        }
        MissionExecution execution = execOpt.get();
        if (execution.getStatus() == ExecutionStatus.COMPLETED
                || execution.getStatus() == ExecutionStatus.ABORTED
                || execution.getStatus() == ExecutionStatus.FAILED) {
            log.debug("Ignoring flight lifecycle event [{}] for already terminal execution {} (status={})",
                    event.eventType(), executionId, execution.getStatus());
            return;
        }

        switch (event.eventType()) {
            case FlightLifecycleEvent.FLIGHT_AUTHORIZED -> {
                if (leg != null && leg.getStatus() == LegStatus.PLANNED) {
                    leg.setStatus(LegStatus.AUTHORIZED);
                    missionExecutionLegRepository.save(leg);
                }
            }
            case FlightLifecycleEvent.FLIGHT_STARTED -> {
                if (leg != null) {
                    leg.setStatus(LegStatus.ACTIVE);
                    missionExecutionLegRepository.save(leg);
                    execution.setCurrentLegIndex(leg.getLegIndex());
                } else if (event.legIndex() != null) {
                    execution.setCurrentLegIndex(event.legIndex());
                }
                if (execution.getStatus() != ExecutionStatus.IN_PROGRESS) {
                    execution.setStatus(ExecutionStatus.IN_PROGRESS);
                }
                missionExecutionRepository.save(execution);
            }
            case FlightLifecycleEvent.FLIGHT_WAYPOINT_REACHED -> {
                Integer wpIdx = event.waypointIndex();
                if (wpIdx != null) {
                    execution.setCurrentWaypointIndex(wpIdx);
                }
                int completedWps = execution.getCompletedWaypoints() != null ? execution.getCompletedWaypoints() : 0;
                execution.setCompletedWaypoints(completedWps + 1);

                List<Map<String, Object>> logs = execution.getWaypointLogs() != null
                        ? new ArrayList<>(execution.getWaypointLogs())
                        : new ArrayList<>();
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("flightId", event.flightId());
                entry.put("legIndex", leg != null ? leg.getLegIndex() : event.legIndex());
                entry.put("waypointIndex", wpIdx);
                entry.put("reachedAt", event.timestamp() != null ? event.timestamp().toString() : ZonedDateTime.now().toString());
                if (Boolean.TRUE.equals(event.waitForConfirmation())) {
                    entry.put("waitForConfirmation", true);
                }
                logs.add(entry);
                execution.setWaypointLogs(logs);
                missionExecutionRepository.save(execution);
                log.info("Execution {} reached waypoint {} on flight {} (total completed waypoints: {})",
                        executionId, wpIdx, event.flightId(), execution.getCompletedWaypoints());
            }
            case FlightLifecycleEvent.FLIGHT_COMPLETED -> {
                if (leg != null) {
                    leg.setStatus(LegStatus.COMPLETED);
                    missionExecutionLegRepository.save(leg);
                }
                List<MissionExecutionLeg> allLegs = missionExecutionLegRepository != null
                        ? missionExecutionLegRepository.findByExecutionIdOrderByLegIndexAsc(executionId)
                        : List.of();
                int completedCount;
                boolean allCompleted;
                if (!allLegs.isEmpty()) {
                    completedCount = (int) allLegs.stream().filter(l -> l.getStatus() == LegStatus.COMPLETED).count();
                    allCompleted = completedCount >= allLegs.size();
                } else {
                    completedCount = (execution.getCompletedLegs() != null ? execution.getCompletedLegs() : 0) + 1;
                    int total = execution.getTotalLegs() != null ? execution.getTotalLegs() : 1;
                    allCompleted = completedCount >= total;
                }
                execution.setCompletedLegs(completedCount);
                if (allCompleted) {
                    execution.setStatus(ExecutionStatus.COMPLETED);
                    execution.setCompletedAt(ZonedDateTime.now());
                    missionRepository.findById(execution.getMissionId()).ifPresent(mission -> {
                        if (mission.getScheduleType() == MissionScheduleType.RECURRING
                                && mission.getRecurringPattern() != null
                                && !mission.getRecurringPattern().isBlank()) {
                            Optional<ZonedDateTime> nextRun = computeNextRecurringTime(mission.getRecurringPattern());
                            if (nextRun.isPresent()) {
                                mission.setScheduledAt(nextRun.get());
                                mission.setStatus(MissionStatus.SCHEDULED);
                                log.info("Recurring mission {} rescheduled for next cycle at {}",
                                        mission.getId(), nextRun.get());
                            } else {
                                mission.setStatus(MissionStatus.COMPLETED);
                            }
                        } else {
                            mission.setStatus(MissionStatus.COMPLETED);
                        }
                        missionRepository.save(mission);
                    });
                    log.info("Mission {} execution {} COMPLETED (all {} leg(s) completed)",
                            execution.getMissionId(), executionId, completedCount);
                }
                missionExecutionRepository.save(execution);
            }
            case FlightLifecycleEvent.FLIGHT_DIVERTED,
                    FlightLifecycleEvent.FLIGHT_EMERGENCY_LANDING,
                    FlightLifecycleEvent.FLIGHT_CANCELLED,
                    FlightLifecycleEvent.FLIGHT_REJECTED -> {
                LegStatus targetLegStatus = switch (event.eventType()) {
                    case FlightLifecycleEvent.FLIGHT_DIVERTED -> LegStatus.DIVERTED;
                    case FlightLifecycleEvent.FLIGHT_EMERGENCY_LANDING -> LegStatus.EMERGENCY_LANDING;
                    default -> LegStatus.CANCELLED;
                };
                if (leg != null) {
                    leg.setStatus(targetLegStatus);
                    if (FlightLifecycleEvent.FLIGHT_DIVERTED.equals(event.eventType())
                            && event.actualLandingHubId() != null && !event.actualLandingHubId().isBlank()) {
                        leg.setArrivalHubId(event.actualLandingHubId().trim());
                    }
                    missionExecutionLegRepository.save(leg);
                }

                List<MissionExecutionLeg> allLegs = missionExecutionLegRepository != null
                        ? missionExecutionLegRepository.findByExecutionIdOrderByLegIndexAsc(executionId)
                        : List.of();

                // Synchronize downstream leg departureHubId when a leg diverts to an alternate Hub
                if (FlightLifecycleEvent.FLIGHT_DIVERTED.equals(event.eventType())
                        && leg != null
                        && event.actualLandingHubId() != null
                        && !event.actualLandingHubId().isBlank()) {
                    String divertedHubId = event.actualLandingHubId().trim();
                    int nextIdx = leg.getLegIndex() + 1;
                    for (MissionExecutionLeg nextLeg : allLegs) {
                        if (nextLeg.getLegIndex() == nextIdx
                                && (nextLeg.getStatus() == LegStatus.PLANNED || nextLeg.getStatus() == LegStatus.AUTHORIZED)) {
                            nextLeg.setDepartureHubId(divertedHubId);
                            if (nextLeg.getStatus() == LegStatus.AUTHORIZED) {
                                nextLeg.setStatus(LegStatus.PLANNED);
                            }
                            missionExecutionLegRepository.save(nextLeg);
                            if (nextLeg.getFlightId() != null && !nextLeg.getFlightId().isBlank()) {
                                flightClientService.updateFlightLegPlan(
                                        nextLeg.getFlightId(),
                                        Map.of("departureHubId", divertedHubId));
                            }
                            log.info("Updated downstream leg {} departureHubId to diverted hub {} for execution {}",
                                    nextIdx, divertedHubId, executionId);
                            break;
                        }
                    }
                }

                boolean hasRemainingPlannedLegs = allLegs.stream()
                        .anyMatch(l -> l.getStatus() == LegStatus.PLANNED || l.getStatus() == LegStatus.AUTHORIZED);

                String detail = String.format("Flight %s ended with %s%s",
                        event.flightNumber() != null ? event.flightNumber() : event.flightId(),
                        event.eventType(),
                        event.reason() != null ? ": " + event.reason() : "");
                execution.setErrorMessage(detail);

                if (hasRemainingPlannedLegs) {
                    execution.setStatus(ExecutionStatus.PAUSED);
                    execution.setPausedAt(ZonedDateTime.now());
                    missionRepository.findById(execution.getMissionId()).ifPresent(mission -> {
                        mission.setStatus(MissionStatus.PAUSED);
                        missionRepository.save(mission);
                    });
                    log.warn(
                            "Execution {} paused after leg incident so operator can recover/reassign replacement drone or abort: {}",
                            executionId, detail);
                } else {
                    ExecutionStatus finalExecStatus = FlightLifecycleEvent.FLIGHT_CANCELLED.equals(event.eventType())
                            || FlightLifecycleEvent.FLIGHT_REJECTED.equals(event.eventType())
                                    ? ExecutionStatus.ABORTED
                                    : ExecutionStatus.FAILED;
                    MissionStatus finalMissionStatus = finalExecStatus == ExecutionStatus.ABORTED
                            ? MissionStatus.ABORTED
                            : MissionStatus.FAILED;
                    execution.setStatus(finalExecStatus);
                    execution.setCompletedAt(ZonedDateTime.now());
                    missionRepository.findById(execution.getMissionId()).ifPresent(mission -> {
                        mission.setStatus(finalMissionStatus);
                        missionRepository.save(mission);
                    });
                    log.warn("Execution {} transitioned to {}: {}", executionId, finalExecStatus, detail);
                }
                missionExecutionRepository.save(execution);
            }
            default -> log.debug("Ignoring flight event type {}", event.eventType());
        }
    }

    private Optional<ZonedDateTime> computeNextRecurringTime(String cronPattern) {
        try {
            CronExpression cron = CronExpression.parse(cronPattern.trim());
            return Optional.ofNullable(cron.next(ZonedDateTime.now()));
        } catch (IllegalArgumentException ex) {
            log.warn("Invalid recurring cron pattern '{}': {}", cronPattern, ex.getMessage());
            return Optional.empty();
        }
    }

    private DroneBriefVm resolveReferenceDroneForPlanSplit(Mission mission) {
        if (droneClientService == null || mission.getDroneId() == null || mission.getDroneId().isBlank()) {
            return null;
        }
        return droneClientService.getDroneById(mission.getDroneId().trim()).orElse(null);
    }

    private DroneBriefVm resolveReferenceDroneForSplit(Mission mission, MissionExecutePostVm postVm) {
        String requestedId = (postVm.droneId() != null && !postVm.droneId().isBlank())
                ? postVm.droneId().trim()
                : (mission.getDroneId() != null && !mission.getDroneId().isBlank() ? mission.getDroneId().trim() : null);
        if (requestedId == null || Boolean.TRUE.equals(postVm.autoAssign())) {
            return null;
        }
        return droneClientService.getDroneById(requestedId).orElse(null);
    }

    private ExecutionMode resolveExecutionMode(
            MissionExecutePostVm postVm,
            List<MissionLegUtils.PlannedLegSpec> legs) {
        if (postVm.executionMode() != null) {
            return postVm.executionMode();
        }
        if (postVm.legAssignments() != null && !postVm.legAssignments().isEmpty()) {
            return ExecutionMode.MULTI_DRONE_RELAY;
        }
        boolean hasRelayStop = legs.stream().anyMatch(l -> l.stopoverType() == StopoverType.RELAY_HANDOFF);
        return hasRelayStop ? ExecutionMode.MULTI_DRONE_RELAY : ExecutionMode.SAME_DRONE_SEQUENTIAL;
    }

    private record ResolvedAssignments(
            Map<Integer, String> legDroneIds,
            Map<Integer, DroneBriefVm> legDrones
    ) {
    }

    private ResolvedAssignments resolveLegDroneAssignments(
            Mission mission,
            MissionExecutePostVm postVm,
            ExecutionMode mode,
            List<MissionLegUtils.PlannedLegSpec> legs,
            Map<String, HubBriefVm> hubMap,
            ZonedDateTime initialDepartureTime) {
        Map<Integer, String> assignments = new HashMap<>();
        Map<Integer, DroneBriefVm> drones = new HashMap<>();

        if (mode == ExecutionMode.MULTI_DRONE_RELAY) {
            Map<Integer, String> explicit = new HashMap<>();
            if (postVm.legAssignments() != null) {
                for (LegDroneAssignmentVm item : postVm.legAssignments()) {
                    explicit.put(item.legIndex(), item.droneId().trim());
                }
            }

            Map<String, String> projectedHubByDrone = new HashMap<>();
            Map<String, ZonedDateTime> busyUntilByDrone = new HashMap<>();
            ZonedDateTime cursorTime = initialDepartureTime;

            for (MissionLegUtils.PlannedLegSpec leg : legs) {
                String explicitDroneId = explicit.get(leg.legIndex());
                DroneBriefVm selectedDrone = null;
                String selectedDroneId;

                if (explicitDroneId != null && !explicitDroneId.isBlank()) {
                    selectedDrone = droneClientService.getDroneById(explicitDroneId)
                            .orElseThrow(
                                    () -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id", explicitDroneId));
                    validateDroneAvailability(selectedDrone, explicitDroneId, leg.payloadWeightKg());

                    String effectiveHub = projectedHubByDrone.getOrDefault(explicitDroneId, selectedDrone.currentHubId());
                    if (effectiveHub != null && !effectiveHub.isBlank()
                            && leg.departureHubId() != null && !leg.departureHubId().equals(effectiveHub)) {
                        throw new BadRequestException(MessageCode.DRONE_NOT_AT_DEPARTURE_HUB,
                                "droneHubId", effectiveHub,
                                "departureHubId", leg.departureHubId());
                    }
                    ZonedDateTime busyUntil = busyUntilByDrone.get(explicitDroneId);
                    if (busyUntil != null && busyUntil.isAfter(cursorTime)) {
                        throw new BadRequestException(MessageCode.DRONE_SCHEDULE_CONFLICT,
                                "droneId", explicitDroneId);
                    }
                    selectedDroneId = explicitDroneId;
                } else {
                    List<ScoredDroneCandidateVm> scored = fleetScoringService.scoreCandidateDronesForLeg(leg);
                    ScoredDroneCandidateVm picked = null;
                    if (scored != null && !scored.isEmpty()) {
                        for (ScoredDroneCandidateVm cand : scored) {
                            if (!cand.eligible()) {
                                continue;
                            }
                            ZonedDateTime busyUntil = busyUntilByDrone.get(cand.droneId());
                            if (busyUntil != null && busyUntil.isAfter(cursorTime)) {
                                continue;
                            }
                            String projHub = projectedHubByDrone.get(cand.droneId());
                            if (projHub != null && leg.departureHubId() != null && !leg.departureHubId().equals(projHub)) {
                                continue;
                            }
                            picked = cand;
                            break;
                        }
                    }
                    if (picked == null) {
                        picked = fleetScoringService.getBestCandidateForLeg(leg);
                    }
                    selectedDroneId = picked.droneId();
                }

                long durSec = MissionLegUtils.computeLegDurationSeconds(leg, selectedDrone, hubMap);
                ZonedDateTime legArr = cursorTime.plusSeconds(durSec);
                int turnaroundMin = leg.stopoverType() == StopoverType.NONE ? 0 : Math.max(0, leg.groundTimeMinutes());

                projectedHubByDrone.put(selectedDroneId, leg.arrivalHubId());
                busyUntilByDrone.put(selectedDroneId, legArr.plusMinutes(turnaroundMin));
                cursorTime = legArr.plusMinutes(turnaroundMin);

                assignments.put(leg.legIndex(), selectedDroneId);
                if (selectedDrone != null) {
                    drones.put(leg.legIndex(), selectedDrone);
                }
            }
            return new ResolvedAssignments(assignments, drones);
        }

        String singleDroneId;
        DroneBriefVm singleDrone = null;
        double maxRequiredPayload = legs.stream()
                .mapToDouble(MissionLegUtils.PlannedLegSpec::payloadWeightKg)
                .max()
                .orElse(mission.getPayloadWeightKg() != null ? mission.getPayloadWeightKg() : 0.0);

        String requestedDroneId = (postVm.droneId() != null && !postVm.droneId().isBlank())
                ? postVm.droneId().trim()
                : (mission.getDroneId() != null && !mission.getDroneId().isBlank()
                        ? mission.getDroneId().trim()
                        : null);

        if (Boolean.TRUE.equals(postVm.autoAssign()) || requestedDroneId == null) {
            ScoredDroneCandidateVm bestCandidate = fleetScoringService.getBestCandidate(mission.getId());
            singleDroneId = bestCandidate.droneId();
            log.info("Auto-assigned candidate drone {} ({}) with score {} for mission {}",
                    singleDroneId, bestCandidate.registrationNumber(), bestCandidate.finalScore(), mission.getId());
        } else {
            singleDroneId = requestedDroneId;
            singleDrone = droneClientService.getDroneById(singleDroneId)
                    .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id", singleDroneId));
            validateDroneAvailability(singleDrone, singleDroneId, maxRequiredPayload);
            String firstDepartureHub = !legs.isEmpty() ? legs.getFirst().departureHubId() : mission.getDepartureHubId();
            if (singleDrone.currentHubId() != null && !singleDrone.currentHubId().isBlank()
                    && firstDepartureHub != null && !firstDepartureHub.equals(singleDrone.currentHubId())) {
                throw new BadRequestException(MessageCode.DRONE_NOT_AT_DEPARTURE_HUB,
                        "droneHubId", singleDrone.currentHubId(),
                        "departureHubId", firstDepartureHub);
            }
        }

        for (MissionLegUtils.PlannedLegSpec leg : legs) {
            assignments.put(leg.legIndex(), singleDroneId);
            if (singleDrone != null) {
                drones.put(leg.legIndex(), singleDrone);
            }
        }
        return new ResolvedAssignments(assignments, drones);
    }

    private void validateDroneAvailability(DroneBriefVm drone, String droneId, double requiredPayloadKg) {
        if (drone.status() != null && !"available".equalsIgnoreCase(drone.status())
                && !"idle".equalsIgnoreCase(drone.status())) {
            throw new BadRequestException(MessageCode.DRONE_NOT_AVAILABLE, "registrationNumber",
                    drone.registrationNumber() != null ? drone.registrationNumber() : droneId);
        }
        if (drone.maxPayload() != null && drone.maxPayload() < requiredPayloadKg) {
            throw new BadRequestException(MessageCode.DRONE_NOT_AVAILABLE,
                    "registrationNumber",
                    drone.registrationNumber() != null ? drone.registrationNumber() : droneId,
                    "reason",
                    String.format("Drone max payload (%.1f kg) is less than required payload (%.1f kg)",
                            drone.maxPayload(), requiredPayloadKg));
        }
    }

    private Map<String, HubBriefVm> fetchRelevantHubs(Mission mission, List<Waypoint> waypoints) {
        if (hubClientService == null) {
            return new HashMap<>();
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
        return new HashMap<>(hubClientService.getHubsByIds(hubIds));
    }

    private MissionExecutionVm toExecutionVm(MissionExecution execution, List<MissionExecutionLeg> legs) {
        if (legs != null && !legs.isEmpty()) {
            List<MissionExecutionLegVm> legVms = missionExecutionMapper.toLegVmList(legs);
            MissionExecutionVm enriched = missionExecutionMapper.toVm(execution, legVms != null ? legVms : List.of());
            if (enriched != null) {
                return enriched;
            }
        }
        return missionExecutionMapper.toVm(execution);
    }
}
