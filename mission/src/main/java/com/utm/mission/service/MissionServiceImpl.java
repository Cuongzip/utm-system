package com.utm.mission.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.generator.BusinessCodeGenerator;
import com.utm.commonlibrary.generator.CodePatternRule;
import com.utm.mission.mapper.MissionMapper;
import com.utm.mission.mapper.WaypointMapper;
import com.utm.mission.model.Mission;
import com.utm.mission.model.Waypoint;
import com.utm.mission.model.enumeration.MissionScheduleType;
import com.utm.mission.model.enumeration.MissionStatus;
import com.utm.mission.model.enumeration.StopoverType;
import com.utm.mission.model.enumeration.WaypointType;
import com.utm.mission.repository.MissionRepository;
import com.utm.mission.repository.WaypointRepository;
import com.utm.mission.service.client.HubClientService;
import com.utm.mission.util.MissionLegUtils;
import com.utm.mission.viewmodel.client.HubBriefVm;
import com.utm.mission.viewmodel.mission.MissionListVm;
import com.utm.mission.viewmodel.mission.MissionPostVm;
import com.utm.mission.viewmodel.mission.MissionPutVm;
import com.utm.mission.viewmodel.mission.MissionVm;
import com.utm.mission.viewmodel.waypoint.WaypointVm;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class MissionServiceImpl implements MissionService {

    private static final double DEFAULT_CRUISE_SPEED_MPS = 15.0;

    private final MissionRepository missionRepository;
    private final WaypointRepository waypointRepository;
    private final MissionMapper missionMapper;
    private final WaypointMapper waypointMapper;
    private final HubClientService hubClientService;

    @Override
    @Transactional
    public MissionVm createMission(MissionPostVm postVm) {
        HubBriefVm depHub = hubClientService.getHubById(postVm.departureHubId())
                .orElseThrow(() -> new NotFoundException(MessageCode.DEPARTURE_HUB_NOT_FOUND, "id",
                        postVm.departureHubId()));
        HubBriefVm arrHub = hubClientService.getHubById(postVm.arrivalHubId())
                .orElseThrow(() -> new NotFoundException(MessageCode.ARRIVAL_HUB_NOT_FOUND, "id",
                        postVm.arrivalHubId()));

        if (postVm.scheduleType() == MissionScheduleType.SCHEDULED) {
            if (postVm.scheduledAt() == null || !postVm.scheduledAt().isAfter(ZonedDateTime.now())) {
                throw new BadRequestException(MessageCode.SCHEDULED_TIME_MUST_BE_FUTURE);
            }
        }

        String code;
        if (postVm.code() == null || postVm.code().trim().isBlank()) {
            code = BusinessCodeGenerator.generateUnique(
                    CodePatternRule.MISSION_CODE,
                    missionRepository::existsByCode);
        } else {
            code = postVm.code().trim().toUpperCase();
            if (missionRepository.existsByCode(code)) {
                throw new DuplicatedException(MessageCode.MISSION_CODE_ALREADY_EXISTED, "code", code);
            }
        }

        Mission mission = missionMapper.toEntity(postVm);
        mission.setCode(code);
        mission.setStatus(MissionStatus.DRAFT);
        initializeTerminalHubWaypoints(mission, depHub, arrHub);
        double initialDistance = calculateEstimatedDistance(mission.getWaypoints(), depHub, arrHub);
        mission.setEstimatedDistance(initialDistance);
        mission.setEstimatedDuration(calculateEstimatedDuration(mission.getWaypoints(), initialDistance));
        Mission saved = missionRepository.save(mission);

        return toEnrichedMissionVm(saved, depHub, arrHub, initialDistance);
    }

    @Override
    @Transactional(readOnly = true)
    public MissionListVm getMissions(String status, String departureHubId, String arrivalHubId,
            String scheduleType, Integer limit, Integer offset) {
        return getMissions(status, departureHubId, arrivalHubId, null, scheduleType, limit, offset);
    }

    @Override
    @Transactional(readOnly = true)
    public MissionListVm getMissions(String status, String departureHubId, String arrivalHubId, String droneId,
            String scheduleType, Integer limit, Integer offset) {
        Specification<Mission> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null && !status.isBlank()) {
                try {
                    MissionStatus missionStatus = MissionStatus.fromValue(status.trim());
                    predicates.add(cb.equal(root.get("status"), missionStatus));
                } catch (IllegalArgumentException ignored) {
                }
            }
            if (departureHubId != null && !departureHubId.isBlank()) {
                predicates.add(cb.equal(root.get("departureHubId"), departureHubId.trim()));
            }
            if (arrivalHubId != null && !arrivalHubId.isBlank()) {
                predicates.add(cb.equal(root.get("arrivalHubId"), arrivalHubId.trim()));
            }
            if (droneId != null && !droneId.isBlank()) {
                predicates.add(cb.equal(root.get("droneId"), droneId.trim()));
            }
            if (scheduleType != null && !scheduleType.isBlank()) {
                try {
                    MissionScheduleType type = MissionScheduleType.fromValue(scheduleType.trim());
                    predicates.add(cb.equal(root.get("scheduleType"), type));
                } catch (IllegalArgumentException ignored) {
                }
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        int pageSize = (limit != null && limit > 0) ? limit : 20;
        int pageOffset = offset != null ? Math.max(0, offset) : 0;
        int pageNumber = pageOffset / pageSize;
        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.DESC, "createdOn"));

        Page<Mission> page = missionRepository.findAll(spec, pageable);

        Set<String> hubIds = new HashSet<>();
        List<String> missionIds = new ArrayList<>();
        for (Mission m : page.getContent()) {
            missionIds.add(m.getId());
            if (m.getDepartureHubId() != null) {
                hubIds.add(m.getDepartureHubId());
            }
            if (m.getArrivalHubId() != null) {
                hubIds.add(m.getArrivalHubId());
            }
        }
        Map<String, HubBriefVm> hubMap = hubClientService.getHubsByIds(hubIds);

        Map<String, Long> wpCountMap = new HashMap<>();
        if (!missionIds.isEmpty()) {
            for (Object[] row : waypointRepository.countByMissionIds(missionIds)) {
                wpCountMap.put((String) row[0], ((Number) row[1]).longValue());
            }
        }

        List<MissionVm> items = page.getContent().stream()
                .map(m -> {
                    long wpCount = wpCountMap.getOrDefault(m.getId(), 0L);
                    HubBriefVm depHub = hubMap.get(m.getDepartureHubId());
                    HubBriefVm arrHub = hubMap.get(m.getArrivalHubId());
                    return missionMapper.toVm(m, (int) wpCount, m.getEstimatedDistance(), null, depHub, arrHub);
                })
                .toList();

        return MissionListVm.of(items, page.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public MissionVm getMissionById(String id) {
        Mission mission = missionRepository.findByIdWithWaypoints(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, "id", id));

        Optional<HubBriefVm> depHub = hubClientService.getHubById(mission.getDepartureHubId());
        Optional<HubBriefVm> arrHub = hubClientService.getHubById(mission.getArrivalHubId());
        double estimatedDistance = calculateEstimatedDistance(
                mission.getWaypoints(), depHub.orElse(null), arrHub.orElse(null));

        return toEnrichedMissionVm(mission, depHub.orElse(null), arrHub.orElse(null), estimatedDistance);
    }

    @Override
    @Transactional
    public MissionVm updateMission(String id, MissionPutVm putVm) {
        Mission mission = missionRepository.findByIdWithWaypoints(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, "id", id));

        if (mission.getStatus() == MissionStatus.EXECUTING) {
            throw new BadRequestException(MessageCode.CANNOT_EDIT_EXECUTING_MISSION);
        }
        if (mission.getStatus() != MissionStatus.DRAFT) {
            throw new BadRequestException(MessageCode.MISSION_NOT_IN_DRAFT_STATUS);
        }

        if (putVm.departureHubId() != null && !putVm.departureHubId().isBlank()
                && !putVm.departureHubId().equals(mission.getDepartureHubId())) {
            if (!hubClientService.checkHubExists(putVm.departureHubId())) {
                throw new NotFoundException(MessageCode.DEPARTURE_HUB_NOT_FOUND, "id",
                        putVm.departureHubId());
            }
        }
        if (putVm.arrivalHubId() != null && !putVm.arrivalHubId().isBlank()
                && !putVm.arrivalHubId().equals(mission.getArrivalHubId())) {
            if (!hubClientService.checkHubExists(putVm.arrivalHubId())) {
                throw new NotFoundException(MessageCode.ARRIVAL_HUB_NOT_FOUND, "id", putVm.arrivalHubId());
            }
        }

        MissionScheduleType targetScheduleType = putVm.scheduleType() != null ? putVm.scheduleType()
                : mission.getScheduleType();
        ZonedDateTime targetScheduledAt = putVm.scheduledAt() != null ? putVm.scheduledAt() : mission.getScheduledAt();
        if (targetScheduleType == MissionScheduleType.SCHEDULED) {
            if (targetScheduledAt == null || !targetScheduledAt.isAfter(ZonedDateTime.now())) {
                throw new BadRequestException(MessageCode.SCHEDULED_TIME_MUST_BE_FUTURE);
            }
        }

        String previousDepHubId = mission.getDepartureHubId();
        String previousArrHubId = mission.getArrivalHubId();
        missionMapper.updateEntityFromVm(putVm, mission);

        Optional<HubBriefVm> depHub = hubClientService.getHubById(mission.getDepartureHubId());
        Optional<HubBriefVm> arrHub = hubClientService.getHubById(mission.getArrivalHubId());
        syncTerminalHubWaypoints(mission, previousDepHubId, previousArrHubId, depHub.orElse(null), arrHub.orElse(null));
        double estimatedDistance = calculateEstimatedDistance(
                mission.getWaypoints(), depHub.orElse(null), arrHub.orElse(null));
        mission.setEstimatedDistance(estimatedDistance);
        mission.setEstimatedDuration(calculateEstimatedDuration(mission.getWaypoints(), estimatedDistance));

        Mission updated = missionRepository.save(mission);
        return toEnrichedMissionVm(updated, depHub.orElse(null), arrHub.orElse(null), estimatedDistance);
    }

    @Override
    @Transactional
    public void deleteMission(String id) {
        Mission mission = missionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, "id", id));

        if (mission.getStatus() == MissionStatus.EXECUTING || mission.getStatus() == MissionStatus.PAUSED) {
            throw new BadRequestException(MessageCode.CANNOT_DELETE_EXECUTING_MISSION);
        }

        missionRepository.delete(mission);
    }

    @Override
    @Transactional
    public MissionVm scheduleMission(String id) {
        Mission mission = missionRepository.findByIdWithWaypoints(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, "id", id));

        if (mission.getStatus() != MissionStatus.DRAFT
                && mission.getStatus() != MissionStatus.COMPLETED
                && mission.getStatus() != MissionStatus.ABORTED
                && mission.getStatus() != MissionStatus.FAILED) {
            throw new BadRequestException(MessageCode.MISSION_NOT_IN_DRAFT_STATUS);
        }
        if ((mission.getScheduleType() != MissionScheduleType.SCHEDULED
                && mission.getScheduleType() != MissionScheduleType.RECURRING)
                || mission.getScheduledAt() == null
                || !mission.getScheduledAt().isAfter(ZonedDateTime.now())) {
            throw new BadRequestException(MessageCode.SCHEDULED_TIME_MUST_BE_FUTURE);
        }
        if (mission.getWaypoints() == null || mission.getWaypoints().size() < 2) {
            throw new BadRequestException(MessageCode.MISSION_WAYPOINTS_LESS_THAN_TWO,
                    "Mission must have at least 2 waypoints to be scheduled");
        }
        if (mission.getDepartureHubId() != null
                && mission.getDepartureHubId().equals(mission.getArrivalHubId())
                && mission.getWaypoints().size() <= 2
                && mission.getWaypoints().stream().allMatch(w -> w.getWaypointType() == WaypointType.HUB
                        && (w.getStopoverType() == null || w.getStopoverType() == StopoverType.NONE))) {
            throw new BadRequestException(MessageCode.MISSION_WAYPOINTS_LESS_THAN_TWO,
                    "Round-trip mission returning to the same hub requires at least 1 intermediate waypoint");
        }

        mission.setStatus(MissionStatus.SCHEDULED);
        Mission saved = missionRepository.save(mission);

        Optional<HubBriefVm> depHub = hubClientService.getHubById(saved.getDepartureHubId());
        Optional<HubBriefVm> arrHub = hubClientService.getHubById(saved.getArrivalHubId());
        double estimatedDistance = calculateEstimatedDistance(
                saved.getWaypoints(), depHub.orElse(null), arrHub.orElse(null));

        return toEnrichedMissionVm(saved, depHub.orElse(null), arrHub.orElse(null), estimatedDistance);
    }

    @Override
    @Transactional
    public MissionVm unscheduleMission(String id) {
        Mission mission = missionRepository.findByIdWithWaypoints(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, "id", id));

        if (mission.getStatus() != MissionStatus.SCHEDULED) {
            throw new BadRequestException(MessageCode.MISSION_EXECUTION_INVALID_STATE,
                    "Only scheduled missions can be reverted to draft");
        }

        mission.setStatus(MissionStatus.DRAFT);
        Mission saved = missionRepository.save(mission);

        Optional<HubBriefVm> depHub = hubClientService.getHubById(saved.getDepartureHubId());
        Optional<HubBriefVm> arrHub = hubClientService.getHubById(saved.getArrivalHubId());
        double estimatedDistance = calculateEstimatedDistance(
                saved.getWaypoints(), depHub.orElse(null), arrHub.orElse(null));

        return toEnrichedMissionVm(saved, depHub.orElse(null), arrHub.orElse(null), estimatedDistance);
    }

    @Override
    @Transactional
    public MissionVm duplicateMission(String id) {
        Mission original = missionRepository.findByIdWithWaypoints(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, "id", id));

        Mission copy = missionMapper.cloneEntity(original);
        copy.setCode(BusinessCodeGenerator.generateUnique(
                CodePatternRule.MISSION_CODE,
                missionRepository::existsByCode));
        copy.setName(original.getName() + " (Copy)");
        copy.setScheduleType(MissionScheduleType.IMMEDIATE);
        copy.setStatus(MissionStatus.DRAFT);

        Mission savedCopy = missionRepository.save(copy);

        if (original.getWaypoints() != null && !original.getWaypoints().isEmpty()) {
            for (Waypoint origWp : original.getWaypoints()) {
                Waypoint wpCopy = waypointMapper.cloneEntity(origWp);
                wpCopy.setMission(savedCopy);
                if (origWp.getActions() != null) {
                    wpCopy.setActions(new HashMap<>(origWp.getActions()));
                }
                if (origWp.getConditions() != null) {
                    wpCopy.setConditions(new HashMap<>(origWp.getConditions()));
                }
                savedCopy.addWaypoint(wpCopy);
            }
            missionRepository.save(savedCopy);
        }

        return getMissionById(savedCopy.getId());
    }

    private MissionVm toEnrichedMissionVm(Mission mission, HubBriefVm depHub, HubBriefVm arrHub,
            Double estimatedDistance) {
        int wpCount = mission.getWaypoints() != null ? mission.getWaypoints().size() : 0;
        List<WaypointVm> waypoints = List.of();
        if (mission.getWaypoints() != null && !mission.getWaypoints().isEmpty()) {
            Set<String> wpHubIds = mission.getWaypoints().stream()
                    .map(Waypoint::getHubId)
                    .filter(id -> id != null && !id.isBlank())
                    .map(String::trim)
                    .collect(java.util.stream.Collectors.toSet());
            if (wpHubIds.isEmpty()) {
                waypoints = waypointMapper.toVmList(mission.getWaypoints());
            } else {
                Map<String, HubBriefVm> wpHubs = new HashMap<>();
                if (depHub != null && depHub.id() != null) {
                    wpHubs.put(depHub.id().trim(), depHub);
                }
                if (arrHub != null && arrHub.id() != null) {
                    wpHubs.put(arrHub.id().trim(), arrHub);
                }
                Set<String> missingHubIds = wpHubIds.stream()
                        .filter(id -> !wpHubs.containsKey(id))
                        .collect(java.util.stream.Collectors.toSet());
                if (!missingHubIds.isEmpty()) {
                    wpHubs.putAll(hubClientService.getHubsByIds(missingHubIds));
                }
                waypoints = mission.getWaypoints().stream()
                        .map(wp -> {
                            HubBriefVm h = wp.getHubId() != null ? wpHubs.get(wp.getHubId().trim()) : null;
                            return h != null ? waypointMapper.toVm(wp, null, h) : waypointMapper.toVm(wp);
                        })
                        .toList();
            }
        }

        return missionMapper.toVm(mission, wpCount, estimatedDistance, waypoints, depHub, arrHub);
    }

    static void initializeTerminalHubWaypoints(Mission mission, HubBriefVm depHub, HubBriefVm arrHub) {
        if (mission == null || depHub == null || arrHub == null
                || depHub.latitude() == null || depHub.longitude() == null
                || arrHub.latitude() == null || arrHub.longitude() == null) {
            return;
        }
        if (mission.getWaypoints() != null && !mission.getWaypoints().isEmpty()) {
            return;
        }
        Waypoint depWp = buildTerminalHubWaypoint(mission, depHub, 1, true);
        Waypoint arrWp = buildTerminalHubWaypoint(mission, arrHub, 2, false);
        mission.addWaypoint(depWp);
        mission.addWaypoint(arrWp);
    }

    private void syncTerminalHubWaypoints(
            Mission mission,
            String previousDepHubId,
            String previousArrHubId,
            HubBriefVm depHub,
            HubBriefVm arrHub
    ) {
        if (mission == null) {
            return;
        }
        List<Waypoint> wps = mission.getWaypoints();
        if (wps == null || wps.isEmpty()) {
            initializeTerminalHubWaypoints(mission, depHub, arrHub);
            return;
        }
        Waypoint first = wps.getFirst();
        if (depHub != null && depHub.latitude() != null && depHub.longitude() != null
                && first.getWaypointType() == WaypointType.HUB
                && (first.getStopoverType() == null || first.getStopoverType() == StopoverType.NONE)
                && (first.getHubId() == null || first.getHubId().equals(previousDepHubId)
                        || first.getHubId().equals(mission.getDepartureHubId()))) {
            first.setHubId(depHub.id());
            first.setName("Departure: " + (depHub.name() != null ? depHub.name() : depHub.code()));
            first.setLatitude(depHub.latitude());
            first.setLongitude(depHub.longitude());
            first.setAltitude(0.0);
        }

        if (wps.size() >= 2) {
            Waypoint last = wps.getLast();
            if (arrHub != null && arrHub.latitude() != null && arrHub.longitude() != null
                    && last.getWaypointType() == WaypointType.HUB
                    && (last.getStopoverType() == null || last.getStopoverType() == StopoverType.NONE)
                    && (last.getHubId() == null || last.getHubId().equals(previousArrHubId)
                            || last.getHubId().equals(mission.getArrivalHubId()))) {
                last.setHubId(arrHub.id());
                last.setName("Arrival: " + (arrHub.name() != null ? arrHub.name() : arrHub.code()));
                last.setLatitude(arrHub.latitude());
                last.setLongitude(arrHub.longitude());
                last.setAltitude(0.0);
            }
        }
    }

    static Waypoint buildTerminalHubWaypoint(Mission mission, HubBriefVm hub, int sequence, boolean departure) {
        String labelPrefix = departure ? "Departure: " : "Arrival: ";
        String hubLabel = hub.name() != null && !hub.name().isBlank()
                ? hub.name()
                : (hub.code() != null ? hub.code() : hub.id());
        Map<String, Object> actions = new HashMap<>();
        actions.put("type", departure ? "takeoff" : "land");
        return Waypoint.builder()
                .mission(mission)
                .sequence(sequence)
                .name(labelPrefix + hubLabel)
                .waypointType(WaypointType.HUB)
                .hubId(hub.id())
                .latitude(hub.latitude())
                .longitude(hub.longitude())
                .altitude(0.0)
                .stopoverType(StopoverType.NONE)
                .groundTimeMinutes(0)
                .payloadDeltaKg(0.0)
                .hoverDurationSec(0)
                .waitForConfirmation(false)
                .actions(actions)
                .build();
    }

    private double calculateEstimatedDistance(List<Waypoint> waypoints, HubBriefVm depHub, HubBriefVm arrHub) {
        return MissionLegUtils.calculateAnchoredDistance(waypoints, depHub, arrHub);
    }

    static int calculateEstimatedDuration(List<Waypoint> waypoints, double distanceMeters) {
        double avgSpeed = DEFAULT_CRUISE_SPEED_MPS;
        int hoverTotalSec = 0;
        int groundTotalSec = 0;
        if (waypoints != null && !waypoints.isEmpty()) {
            double speedSum = 0.0;
            int speedCount = 0;
            for (Waypoint wp : waypoints) {
                if (wp.getSpeedToWaypoint() != null && wp.getSpeedToWaypoint() > 0) {
                    speedSum += wp.getSpeedToWaypoint();
                    speedCount++;
                }
                if (wp.getHoverDurationSec() != null && wp.getHoverDurationSec() > 0) {
                    hoverTotalSec += wp.getHoverDurationSec();
                }
                if (wp.getGroundTimeMinutes() != null && wp.getGroundTimeMinutes() > 0) {
                    groundTotalSec += wp.getGroundTimeMinutes() * 60;
                }
            }
            if (speedCount > 0) {
                avgSpeed = speedSum / speedCount;
            }
        }
        int cruiseSec = distanceMeters > 0 ? (int) Math.ceil(distanceMeters / Math.max(1.0, avgSpeed)) : 0;
        return cruiseSec + hoverTotalSec + groundTotalSec;
    }
}
