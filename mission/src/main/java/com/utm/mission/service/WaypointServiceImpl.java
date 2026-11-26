package com.utm.mission.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.mission.mapper.WaypointMapper;
import com.utm.mission.model.Mission;
import com.utm.mission.model.Waypoint;
import com.utm.mission.model.enumeration.MissionStatus;
import com.utm.mission.model.enumeration.StopoverType;
import com.utm.mission.model.enumeration.WaypointType;
import com.utm.mission.repository.MissionRepository;
import com.utm.mission.repository.WaypointRepository;
import com.utm.mission.service.client.AirspaceClientService;
import com.utm.mission.service.client.DroneClientService;
import com.utm.mission.service.client.HubClientService;
import com.utm.mission.util.MissionLegUtils;
import com.utm.mission.util.MissionRouteSplitter;
import com.utm.mission.viewmodel.client.DroneBriefVm;
import com.utm.mission.viewmodel.client.HubBriefVm;
import com.utm.mission.viewmodel.waypoint.AutoPlanHubsRequestVm;
import com.utm.mission.viewmodel.waypoint.AutoPlanHubsResultVm;
import com.utm.mission.viewmodel.waypoint.WaypointPostVm;
import com.utm.mission.viewmodel.waypoint.WaypointPutVm;
import com.utm.mission.viewmodel.waypoint.WaypointReorderItemVm;
import com.utm.mission.viewmodel.waypoint.WaypointReorderVm;
import com.utm.mission.viewmodel.waypoint.WaypointVm;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
public class WaypointServiceImpl implements WaypointService {

    private final MissionRepository missionRepository;
    private final WaypointRepository waypointRepository;
    private final WaypointMapper waypointMapper;
    private final AirspaceClientService airspaceClientService;
    private final HubClientService hubClientService;
    private final DroneClientService droneClientService;

    @Autowired
    public WaypointServiceImpl(
            MissionRepository missionRepository,
            WaypointRepository waypointRepository,
            WaypointMapper waypointMapper,
            AirspaceClientService airspaceClientService,
            @Autowired(required = false) HubClientService hubClientService,
            @Autowired(required = false) DroneClientService droneClientService
    ) {
        this.missionRepository = missionRepository;
        this.waypointRepository = waypointRepository;
        this.waypointMapper = waypointMapper;
        this.airspaceClientService = airspaceClientService;
        this.hubClientService = hubClientService;
        this.droneClientService = droneClientService;
    }

    @Override
    @Transactional
    public WaypointVm addWaypoint(String missionId, WaypointPostVm postVm) {
        Mission mission = findDraftMissionOrThrow(missionId);
        List<Waypoint> existing = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
        Waypoint terminalArrival = findTerminalArrivalWaypoint(existing, mission);
        int nextSeq;
        if (terminalArrival != null) {
            nextSeq = terminalArrival.getSequence();
        } else {
            nextSeq = existing != null && !existing.isEmpty()
                    ? existing.getLast().getSequence() + 1
                    : waypointRepository.findMaxSequenceByMissionId(missionId) + 1;
        }

        String rawHubId = postVm.hubId() != null && !postVm.hubId().isBlank() ? postVm.hubId().trim() : null;
        WaypointType resolvedType = resolveWaypointType(postVm.waypointType(), rawHubId);

        Double lat = postVm.latitude();
        Double lon = postVm.longitude();
        Double altitude = postVm.altitude();
        HubBriefVm stopoverHub = null;

        if (resolvedType == WaypointType.HUB) {
            if (rawHubId == null) {
                throw new BadRequestException(MessageCode.WAYPOINT_HUB_REQUIRED);
            }
            if (hubClientService != null) {
                stopoverHub = hubClientService.getHubById(rawHubId)
                        .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", rawHubId));
                if (!stopoverHub.isActive()) {
                    throw new BadRequestException(MessageCode.HUB_NOT_ACTIVE, "id", rawHubId);
                }
                if (stopoverHub.latitude() != null && stopoverHub.longitude() != null) {
                    lat = stopoverHub.latitude();
                    lon = stopoverHub.longitude();
                }
            }
            if (altitude == null) {
                altitude = 0.0;
            }
            if (altitude < 0.0) {
                throw new BadRequestException(MessageCode.INVALID_ALTITUDE);
            }
        } else {
            if (altitude == null || altitude <= 0.0) {
                throw new BadRequestException(MessageCode.INVALID_ALTITUDE);
            }
        }

        if (lat == null || lon == null) {
            throw new BadRequestException(MessageCode.INVALID_COORDINATES);
        }

        Optional<String> safetyWarning = resolvedType == WaypointType.COORDINATE
                ? airspaceClientService.checkPointSafety(lat, lon, altitude)
                : Optional.empty();

        Waypoint waypoint = waypointMapper.toEntity(postVm);
        waypoint.setMission(mission);
        waypoint.setSequence(nextSeq);
        waypoint.setWaypointType(resolvedType);
        waypoint.setLatitude(lat);
        waypoint.setLongitude(lon);
        waypoint.setAltitude(altitude);
        if (waypoint.getWaitForConfirmation() == null) {
            waypoint.setWaitForConfirmation(false);
        }
        if (resolvedType == WaypointType.HUB) {
            waypoint.setHubId(stopoverHub != null ? stopoverHub.id() : rawHubId);
            if (waypoint.getName() == null || waypoint.getName().isBlank()) {
                waypoint.setName("Hub Stopover: " + (stopoverHub != null ? stopoverHub.name() : rawHubId));
            }
            if (waypoint.getStopoverType() == null || waypoint.getStopoverType() == StopoverType.NONE) {
                waypoint.setStopoverType(StopoverType.RECHARGE);
            }
            if (waypoint.getGroundTimeMinutes() == null) {
                waypoint.setGroundTimeMinutes(waypoint.getStopoverType().getDefaultGroundTimeMinutes());
            }
        } else {
            waypoint.setHubId(null);
            waypoint.setStopoverType(StopoverType.NONE);
            waypoint.setGroundTimeMinutes(null);
        }

        if (terminalArrival != null) {
            terminalArrival.setSequence(nextSeq + 1);
            waypointRepository.save(terminalArrival);
        }

        Waypoint saved = waypointRepository.save(waypoint);
        refreshMissionEstimates(mission, saved);
        return stopoverHub != null
                ? waypointMapper.toVm(saved, safetyWarning.orElse(null), stopoverHub)
                : waypointMapper.toVm(saved, safetyWarning.orElse(null));
    }

    @Override
    @Transactional(readOnly = true)
    public List<WaypointVm> getWaypoints(String missionId) {
        if (!missionRepository.existsById(missionId)) {
            throw new NotFoundException(MessageCode.MISSION_NOT_FOUND, "id", missionId);
        }
        List<Waypoint> waypoints = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
        return toEnrichedVmList(waypoints, null);
    }

    @Override
    @Transactional
    public WaypointVm updateWaypoint(String missionId, String waypointId, WaypointPutVm putVm) {
        Mission mission = findDraftMissionOrThrow(missionId);

        Waypoint waypoint = waypointRepository.findByIdAndMissionId(waypointId, missionId)
                .orElseThrow(() -> new NotFoundException(MessageCode.WAYPOINT_NOT_FOUND, "id", waypointId));

        List<Waypoint> existingForCheck = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
        boolean isTerminal = isTerminalEndpointWaypoint(waypoint, existingForCheck, mission);
        if (isTerminal) {
            if (putVm.waypointType() == WaypointType.COORDINATE
                    || (putVm.hubId() != null && !putVm.hubId().isBlank()
                            && !putVm.hubId().trim().equals(waypoint.getHubId()))) {
                throw new BadRequestException(MessageCode.WAYPOINT_HUB_REQUIRED,
                        "Cannot convert or change hubId of terminal Departure/Arrival waypoint; update mission Departure/Arrival Hub instead");
            }
            if (putVm.name() != null && !putVm.name().isBlank()) {
                waypoint.setName(putVm.name().trim());
            }
            if (putVm.conditions() != null) {
                waypoint.setConditions(putVm.conditions());
            }
            Waypoint savedTerminal = waypointRepository.save(waypoint);
            HubBriefVm termHub = hubClientService != null && waypoint.getHubId() != null
                    ? hubClientService.getHubById(waypoint.getHubId()).orElse(null)
                    : null;
            return termHub != null
                    ? waypointMapper.toVm(savedTerminal, null, termHub)
                    : waypointMapper.toVm(savedTerminal, null);
        }

        WaypointType currentType = waypoint.getWaypointType() != null
                ? waypoint.getWaypointType()
                : (waypoint.getHubId() != null && !waypoint.getHubId().isBlank() ? WaypointType.HUB : WaypointType.COORDINATE);

        String requestedHubId = putVm.hubId() != null && !putVm.hubId().isBlank() ? putVm.hubId().trim() : null;
        WaypointType targetType;
        if (putVm.waypointType() != null) {
            targetType = putVm.waypointType();
        } else if (requestedHubId != null) {
            targetType = WaypointType.HUB;
        } else {
            targetType = currentType;
        }

        String effectiveHubId = targetType == WaypointType.HUB
                ? (requestedHubId != null ? requestedHubId : waypoint.getHubId())
                : null;

        HubBriefVm stopoverHub = null;
        if (targetType == WaypointType.HUB) {
            if (effectiveHubId == null || effectiveHubId.isBlank()) {
                throw new BadRequestException(MessageCode.WAYPOINT_HUB_REQUIRED);
            }
            if (hubClientService != null) {
                stopoverHub = hubClientService.getHubById(effectiveHubId.trim())
                        .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", effectiveHubId));
                if (!stopoverHub.isActive()) {
                    throw new BadRequestException(MessageCode.HUB_NOT_ACTIVE, "id", effectiveHubId);
                }
            }
        }

        waypointMapper.updateEntityFromVm(putVm, waypoint);
        waypoint.setWaypointType(targetType);

        if (targetType == WaypointType.HUB) {
            waypoint.setHubId(stopoverHub != null ? stopoverHub.id() : effectiveHubId.trim());
            if (stopoverHub != null && stopoverHub.latitude() != null && stopoverHub.longitude() != null) {
                waypoint.setLatitude(stopoverHub.latitude());
                waypoint.setLongitude(stopoverHub.longitude());
            }
            if (waypoint.getAltitude() == null || waypoint.getAltitude() < 0.0) {
                waypoint.setAltitude(0.0);
            }
            if (waypoint.getStopoverType() == null || waypoint.getStopoverType() == StopoverType.NONE) {
                waypoint.setStopoverType(StopoverType.RECHARGE);
            }
            if (waypoint.getGroundTimeMinutes() == null) {
                waypoint.setGroundTimeMinutes(waypoint.getStopoverType().getDefaultGroundTimeMinutes());
            }
        } else {
            waypoint.setHubId(null);
            waypoint.setStopoverType(StopoverType.NONE);
            waypoint.setGroundTimeMinutes(null);
            if (waypoint.getAltitude() == null || waypoint.getAltitude() <= 0.0) {
                throw new BadRequestException(MessageCode.INVALID_ALTITUDE);
            }
        }

        Optional<String> safetyWarning = targetType == WaypointType.COORDINATE
                ? airspaceClientService.checkPointSafety(
                        waypoint.getLatitude(),
                        waypoint.getLongitude(),
                        waypoint.getAltitude())
                : Optional.empty();

        Waypoint saved = waypointRepository.save(waypoint);
        refreshMissionEstimates(mission, null);
        return stopoverHub != null
                ? waypointMapper.toVm(saved, safetyWarning.orElse(null), stopoverHub)
                : waypointMapper.toVm(saved, safetyWarning.orElse(null));
    }

    @Override
    @Transactional
    public void deleteWaypoint(String missionId, String waypointId) {
        Mission mission = findDraftMissionOrThrow(missionId);

        Waypoint waypoint = waypointRepository.findByIdAndMissionId(waypointId, missionId)
                .orElseThrow(() -> new NotFoundException(MessageCode.WAYPOINT_NOT_FOUND, "id", waypointId));

        List<Waypoint> existing = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
        if (isTerminalEndpointWaypoint(waypoint, existing, mission)) {
            throw new BadRequestException(MessageCode.WAYPOINT_REORDER_INVALID,
                    "Cannot delete terminal Departure or Arrival Hub waypoint; update mission Departure/Arrival Hub instead");
        }

        waypointRepository.delete(waypoint);
        waypointRepository.flush();

        List<Waypoint> remaining = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
        int seq = 1;
        for (Waypoint w : remaining) {
            w.setSequence(seq++);
        }
        waypointRepository.saveAll(remaining);
        updateMissionEstimatesFromWaypoints(mission, remaining);
    }

    @Override
    @Transactional
    public List<WaypointVm> reorderWaypoints(String missionId, WaypointReorderVm reorderVm) {
        Mission mission = findDraftMissionOrThrow(missionId);

        List<Waypoint> existingWaypoints = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
        Map<String, Waypoint> waypointMap = existingWaypoints.stream()
                .collect(Collectors.toMap(Waypoint::getId, w -> w));

        Waypoint terminalDep = findTerminalDepartureWaypoint(existingWaypoints, mission);
        Waypoint terminalArr = findTerminalArrivalWaypoint(existingWaypoints, mission);
        boolean hasBothTerminals = terminalDep != null && terminalArr != null && existingWaypoints.size() >= 2;
        int intermediateCount = hasBothTerminals ? existingWaypoints.size() - 2 : existingWaypoints.size();

        boolean isIntermediateOnlyReorder = hasBothTerminals
                && reorderVm.order().size() == intermediateCount
                && reorderVm.order().stream().noneMatch(i -> i.waypointId().equals(terminalDep.getId())
                        || i.waypointId().equals(terminalArr.getId()));

        if (!isIntermediateOnlyReorder && reorderVm.order().size() != existingWaypoints.size()) {
            throw new BadRequestException(MessageCode.WAYPOINT_REORDER_INVALID);
        }

        int expectedSize = isIntermediateOnlyReorder ? intermediateCount : existingWaypoints.size();
        Set<Integer> assignedSequences = new HashSet<>();
        for (WaypointReorderItemVm item : reorderVm.order()) {
            if (!waypointMap.containsKey(item.waypointId())) {
                throw new BadRequestException(MessageCode.WAYPOINT_REORDER_INVALID);
            }
            if (item.sequence() == null || item.sequence() < 1 || item.sequence() > expectedSize) {
                throw new BadRequestException(MessageCode.WAYPOINT_REORDER_INVALID);
            }
            if (!assignedSequences.add(item.sequence())) {
                throw new BadRequestException(MessageCode.WAYPOINT_REORDER_INVALID);
            }
        }

        if (isIntermediateOnlyReorder) {
            terminalDep.setSequence(1);
            for (WaypointReorderItemVm item : reorderVm.order()) {
                Waypoint wp = waypointMap.get(item.waypointId());
                wp.setSequence(item.sequence() + 1);
            }
            terminalArr.setSequence(intermediateCount + 2);
        } else {
            if (terminalDep != null) {
                boolean depMoved = reorderVm.order().stream()
                        .anyMatch(i -> i.waypointId().equals(terminalDep.getId()) && i.sequence() != 1);
                if (depMoved) {
                    throw new BadRequestException(MessageCode.WAYPOINT_REORDER_INVALID,
                            "Terminal Departure Hub waypoint must remain at sequence 1");
                }
            }
            if (terminalArr != null) {
                int lastSeq = existingWaypoints.size();
                boolean arrMoved = reorderVm.order().stream()
                        .anyMatch(i -> i.waypointId().equals(terminalArr.getId()) && i.sequence() != lastSeq);
                if (arrMoved) {
                    throw new BadRequestException(MessageCode.WAYPOINT_REORDER_INVALID,
                            "Terminal Arrival Hub waypoint must remain at final sequence");
                }
            }
            for (WaypointReorderItemVm item : reorderVm.order()) {
                Waypoint wp = waypointMap.get(item.waypointId());
                wp.setSequence(item.sequence());
            }
        }

        waypointRepository.saveAll(existingWaypoints);

        List<Waypoint> sorted = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
        updateMissionEstimatesFromWaypoints(mission, sorted);
        return toEnrichedVmList(sorted, null);
    }

    @Override
    @Transactional
    public AutoPlanHubsResultVm autoPlanHubs(String missionId, AutoPlanHubsRequestVm requestVm) {
        boolean persist = requestVm == null || requestVm.persist() == null || Boolean.TRUE.equals(requestVm.persist());
        Mission mission = persist
                ? findDraftMissionOrThrow(missionId)
                : missionRepository.findById(missionId)
                        .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, "id", missionId));

        List<Waypoint> existingWaypoints = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
        boolean hasHubPair = mission.getDepartureHubId() != null && !mission.getDepartureHubId().isBlank()
                && mission.getArrivalHubId() != null && !mission.getArrivalHubId().isBlank();
        if (existingWaypoints.size() < 2 && !hasHubPair) {
            throw new BadRequestException(MessageCode.MISSION_WAYPOINTS_LESS_THAN_TWO,
                    "Mission must have at least 2 waypoints or a departure/arrival hub pair to plan intermediate hubs");
        }

        DroneBriefVm referenceDrone = null;
        String droneId = requestVm != null && requestVm.droneId() != null && !requestVm.droneId().isBlank()
                ? requestVm.droneId().trim()
                : (mission.getDroneId() != null && !mission.getDroneId().isBlank() ? mission.getDroneId().trim() : null);
        if (droneId != null && droneClientService != null) {
            referenceDrone = droneClientService.getDroneById(droneId)
                    .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id", droneId));
        }

        Map<String, HubBriefVm> hubMap = collectMissionHubs(mission, existingWaypoints);
        List<HubBriefVm> activeHubs = hubClientService != null ? hubClientService.getActiveHubs() : List.of();
        StopoverType preferredType = requestVm != null && requestVm.preferredStopoverType() != null
                ? requestVm.preferredStopoverType()
                : StopoverType.RECHARGE;

        MissionRouteSplitter.RoutePlanResult planResult = MissionRouteSplitter.planWaypointsWithHubs(
                mission, existingWaypoints, hubMap, activeHubs, referenceDrone, preferredType, 1.0);

        List<Waypoint> finalWaypoints;
        if (persist && (planResult.insertedHubCount() > 0 || !planResult.notes().isEmpty())) {
            Map<String, Waypoint> managedById = existingWaypoints.stream()
                    .filter(w -> w.getId() != null)
                    .collect(Collectors.toMap(Waypoint::getId, w -> w));

            List<Waypoint> toSave = new ArrayList<>();
            int seq = 1;
            for (Waypoint planned : planResult.plannedWaypoints()) {
                if (planned.getId() != null && managedById.containsKey(planned.getId())) {
                    Waypoint managed = managedById.get(planned.getId());
                    managed.setSequence(seq++);
                    managed.setStopoverType(planned.getStopoverType());
                    managed.setGroundTimeMinutes(planned.getGroundTimeMinutes());
                    toSave.add(managed);
                } else {
                    planned.setMission(mission);
                    planned.setSequence(seq++);
                    toSave.add(planned);
                }
            }
            waypointRepository.saveAll(toSave);
            waypointRepository.flush();
            finalWaypoints = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
            updateMissionEstimatesFromWaypoints(mission, finalWaypoints);
            missionRepository.save(mission);
        } else {
            finalWaypoints = planResult.plannedWaypoints();
        }

        HubBriefVm depHub = planResult.enrichedHubMap().get(mission.getDepartureHubId());
        HubBriefVm arrHub = planResult.enrichedHubMap().get(mission.getArrivalHubId());
        double dist = MissionLegUtils.calculateAnchoredDistance(finalWaypoints, depHub, arrHub);
        int dur = MissionServiceImpl.calculateEstimatedDuration(finalWaypoints, dist);
        int legCount = MissionLegUtils.decomposeIntoLegs(mission, finalWaypoints, planResult.enrichedHubMap()).size();

        List<WaypointVm> vmList = toEnrichedVmList(finalWaypoints, planResult.enrichedHubMap());
        return new AutoPlanHubsResultVm(
                missionId,
                planResult.insertedHubCount(),
                finalWaypoints.size(),
                legCount,
                dist,
                dur,
                persist,
                vmList,
                planResult.notes());
    }

    private Waypoint findTerminalDepartureWaypoint(List<Waypoint> ordered, Mission mission) {
        if (ordered == null || ordered.size() < 2 || mission == null || mission.getDepartureHubId() == null) {
            return null;
        }
        Waypoint first = ordered.getFirst();
        if (first.getWaypointType() == WaypointType.HUB
                && (first.getStopoverType() == null || first.getStopoverType() == StopoverType.NONE)
                && mission.getDepartureHubId().equals(first.getHubId())) {
            return first;
        }
        return null;
    }

    private Waypoint findTerminalArrivalWaypoint(List<Waypoint> ordered, Mission mission) {
        if (ordered == null || ordered.size() < 2 || mission == null || mission.getArrivalHubId() == null) {
            return null;
        }
        Waypoint last = ordered.getLast();
        if (last.getWaypointType() == WaypointType.HUB
                && (last.getStopoverType() == null || last.getStopoverType() == StopoverType.NONE)
                && mission.getArrivalHubId().equals(last.getHubId())) {
            return last;
        }
        return null;
    }

    private boolean isTerminalEndpointWaypoint(Waypoint candidate, List<Waypoint> ordered, Mission mission) {
        if (candidate == null || candidate.getId() == null) {
            return false;
        }
        Waypoint dep = findTerminalDepartureWaypoint(ordered, mission);
        if (dep != null && candidate.getId().equals(dep.getId())) {
            return true;
        }
        Waypoint arr = findTerminalArrivalWaypoint(ordered, mission);
        return arr != null && candidate.getId().equals(arr.getId());
    }

    private WaypointType resolveWaypointType(WaypointType explicitType, String hubId) {
        if (explicitType != null) {
            return explicitType;
        }
        return hubId != null ? WaypointType.HUB : WaypointType.COORDINATE;
    }

    private List<WaypointVm> toEnrichedVmList(List<Waypoint> waypoints, Map<String, HubBriefVm> preloadedHubs) {
        if (waypoints == null || waypoints.isEmpty()) {
            return List.of();
        }
        Set<String> hubIds = waypoints.stream()
                .map(Waypoint::getHubId)
                .filter(id -> id != null && !id.isBlank())
                .map(String::trim)
                .collect(Collectors.toSet());

        if (hubIds.isEmpty() || (preloadedHubs == null && hubClientService == null)) {
            return waypointMapper.toVmList(waypoints);
        }

        Map<String, HubBriefVm> hubMap = new HashMap<>();
        if (preloadedHubs != null) {
            hubMap.putAll(preloadedHubs);
        }
        Set<String> missing = hubIds.stream()
                .filter(id -> !hubMap.containsKey(id))
                .collect(Collectors.toSet());
        if (!missing.isEmpty() && hubClientService != null) {
            hubMap.putAll(hubClientService.getHubsByIds(missing));
        }

        return waypoints.stream()
                .map(wp -> {
                    HubBriefVm hub = wp.getHubId() != null ? hubMap.get(wp.getHubId().trim()) : null;
                    return hub != null ? waypointMapper.toVm(wp, null, hub) : waypointMapper.toVm(wp);
                })
                .toList();
    }

    private Map<String, HubBriefVm> collectMissionHubs(Mission mission, List<Waypoint> waypoints) {
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

    private Mission findDraftMissionOrThrow(String missionId) {
        Mission mission = missionRepository.findById(missionId)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, "id", missionId));

        if (mission.getStatus() != MissionStatus.DRAFT) {
            throw new BadRequestException(MessageCode.MISSION_NOT_IN_DRAFT_STATUS);
        }
        return mission;
    }

    private void refreshMissionEstimates(Mission mission, Waypoint newlySaved) {
        if (mission == null || mission.getWaypoints() == null) {
            return;
        }
        List<Waypoint> current = new ArrayList<>(mission.getWaypoints());
        if (newlySaved != null && current.stream().noneMatch(w -> newlySaved == w
                || (newlySaved.getId() != null && newlySaved.getId().equals(w.getId())))) {
            current.add(newlySaved);
        }
        updateMissionEstimatesFromWaypoints(mission, current);
    }

    private void updateMissionEstimatesFromWaypoints(Mission mission, List<Waypoint> waypoints) {
        if (mission == null) {
            return;
        }
        HubBriefVm depHub = hubClientService != null && mission.getDepartureHubId() != null
                ? hubClientService.getHubById(mission.getDepartureHubId()).orElse(null)
                : null;
        HubBriefVm arrHub = hubClientService != null && mission.getArrivalHubId() != null
                ? hubClientService.getHubById(mission.getArrivalHubId()).orElse(null)
                : null;
        double dist = MissionLegUtils.calculateAnchoredDistance(waypoints, depHub, arrHub);
        mission.setEstimatedDistance(dist);
        mission.setEstimatedDuration(MissionServiceImpl.calculateEstimatedDuration(waypoints, dist));
    }
}
