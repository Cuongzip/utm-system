package com.utm.mission.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.mission.mapper.MissionMapper;
import com.utm.mission.mapper.WaypointMapper;
import com.utm.mission.model.Mission;
import com.utm.mission.model.Waypoint;
import com.utm.mission.model.enumeration.MissionScheduleType;
import com.utm.mission.model.enumeration.MissionStatus;
import com.utm.mission.repository.MissionRepository;
import com.utm.mission.repository.WaypointRepository;
import com.utm.mission.viewmodel.HubBriefVm;
import com.utm.mission.viewmodel.MissionListVm;
import com.utm.mission.viewmodel.MissionPostVm;
import com.utm.mission.viewmodel.MissionPutVm;
import com.utm.mission.viewmodel.MissionVm;
import com.utm.mission.viewmodel.WaypointVm;
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

    private final MissionRepository missionRepository;
    private final WaypointRepository waypointRepository;
    private final MissionMapper missionMapper;
    private final WaypointMapper waypointMapper;
    private final HubClientService hubClientService;

    @Override
    @Transactional
    public MissionVm createMission(MissionPostVm postVm) {
        if (!hubClientService.checkHubExists(postVm.departureHubId())) {
            throw new NotFoundException(MessageCode.DEPARTURE_HUB_NOT_FOUND, postVm.departureHubId());
        }
        if (!hubClientService.checkHubExists(postVm.arrivalHubId())) {
            throw new NotFoundException(MessageCode.ARRIVAL_HUB_NOT_FOUND, postVm.arrivalHubId());
        }

        if (postVm.scheduleType() == MissionScheduleType.SCHEDULED) {
            if (postVm.scheduledAt() == null || !postVm.scheduledAt().isAfter(ZonedDateTime.now())) {
                throw new BadRequestException(MessageCode.SCHEDULED_TIME_MUST_BE_FUTURE);
            }
        }

        Mission mission = missionMapper.toEntity(postVm);
        mission.setStatus(MissionStatus.DRAFT);
        Mission saved = missionRepository.save(mission);

        Optional<HubBriefVm> depHub = hubClientService.getHubById(saved.getDepartureHubId());
        Optional<HubBriefVm> arrHub = hubClientService.getHubById(saved.getArrivalHubId());

        return toEnrichedMissionVm(saved, depHub.orElse(null), arrHub.orElse(null), 0.0);
    }

    @Override
    @Transactional(readOnly = true)
    public MissionListVm getMissions(String status, String departureHubId, String arrivalHubId, String scheduleType, Integer limit, Integer offset) {
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
        for (Mission m : page.getContent()) {
            if (m.getDepartureHubId() != null) hubIds.add(m.getDepartureHubId());
            if (m.getArrivalHubId() != null) hubIds.add(m.getArrivalHubId());
        }
        Map<String, HubBriefVm> hubMap = hubClientService.getHubsByIds(hubIds);

        List<MissionVm> items = page.getContent().stream()
                .map(m -> {
                    long wpCount = waypointRepository.countByMissionId(m.getId());
                    HubBriefVm depHub = hubMap.get(m.getDepartureHubId());
                    HubBriefVm arrHub = hubMap.get(m.getArrivalHubId());
                    return new MissionVm(
                            m.getId(),
                            m.getName(),
                            m.getDescription(),
                            m.getDepartureHubId(),
                            m.getArrivalHubId(),
                            m.getScheduleType(),
                            m.getScheduledAt(),
                            m.getStatus(),
                            (int) wpCount,
                            null,
                            null,
                            depHub,
                            arrHub,
                            m.getCreatedOn(),
                            m.getCreatedBy(),
                            m.getLastModifiedOn(),
                            m.getLastModifiedBy()
                    );
                })
                .toList();

        return MissionListVm.of(items, page.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public MissionVm getMissionById(String id) {
        Mission mission = missionRepository.findByIdWithWaypoints(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, id));

        double estimatedDistance = calculateEstimatedDistance(mission.getWaypoints());
        Optional<HubBriefVm> depHub = hubClientService.getHubById(mission.getDepartureHubId());
        Optional<HubBriefVm> arrHub = hubClientService.getHubById(mission.getArrivalHubId());

        return toEnrichedMissionVm(mission, depHub.orElse(null), arrHub.orElse(null), estimatedDistance);
    }

    @Override
    @Transactional
    public MissionVm updateMission(String id, MissionPutVm putVm) {
        Mission mission = missionRepository.findByIdWithWaypoints(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, id));

        if (mission.getStatus() == MissionStatus.EXECUTING) {
            throw new BadRequestException(MessageCode.CANNOT_EDIT_EXECUTING_MISSION);
        }
        if (mission.getStatus() != MissionStatus.DRAFT) {
            throw new BadRequestException(MessageCode.MISSION_NOT_IN_DRAFT_STATUS);
        }

        if (putVm.departureHubId() != null && !putVm.departureHubId().isBlank()
                && !putVm.departureHubId().equals(mission.getDepartureHubId())) {
            if (!hubClientService.checkHubExists(putVm.departureHubId())) {
                throw new NotFoundException(MessageCode.DEPARTURE_HUB_NOT_FOUND, putVm.departureHubId());
            }
        }
        if (putVm.arrivalHubId() != null && !putVm.arrivalHubId().isBlank()
                && !putVm.arrivalHubId().equals(mission.getArrivalHubId())) {
            if (!hubClientService.checkHubExists(putVm.arrivalHubId())) {
                throw new NotFoundException(MessageCode.ARRIVAL_HUB_NOT_FOUND, putVm.arrivalHubId());
            }
        }

        MissionScheduleType targetScheduleType = putVm.scheduleType() != null ? putVm.scheduleType() : mission.getScheduleType();
        ZonedDateTime targetScheduledAt = putVm.scheduledAt() != null ? putVm.scheduledAt() : mission.getScheduledAt();
        if (targetScheduleType == MissionScheduleType.SCHEDULED) {
            if (targetScheduledAt == null || !targetScheduledAt.isAfter(ZonedDateTime.now())) {
                throw new BadRequestException(MessageCode.SCHEDULED_TIME_MUST_BE_FUTURE);
            }
        }

        missionMapper.updateEntityFromVm(putVm, mission);
        Mission updated = missionRepository.save(mission);

        double estimatedDistance = calculateEstimatedDistance(updated.getWaypoints());
        Optional<HubBriefVm> depHub = hubClientService.getHubById(updated.getDepartureHubId());
        Optional<HubBriefVm> arrHub = hubClientService.getHubById(updated.getArrivalHubId());

        return toEnrichedMissionVm(updated, depHub.orElse(null), arrHub.orElse(null), estimatedDistance);
    }

    @Override
    @Transactional
    public void deleteMission(String id) {
        Mission mission = missionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, id));

        if (mission.getStatus() == MissionStatus.EXECUTING) {
            throw new BadRequestException(MessageCode.CANNOT_DELETE_EXECUTING_MISSION);
        }

        missionRepository.delete(mission);
    }

    @Override
    @Transactional
    public MissionVm duplicateMission(String id) {
        Mission original = missionRepository.findByIdWithWaypoints(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, id));

        Mission copy = Mission.builder()
                .name(original.getName() + " (Bản sao)")
                .description(original.getDescription())
                .departureHubId(original.getDepartureHubId())
                .arrivalHubId(original.getArrivalHubId())
                .scheduleType(MissionScheduleType.IMMEDIATE)
                .status(MissionStatus.DRAFT)
                .build();

        Mission savedCopy = missionRepository.save(copy);

        if (original.getWaypoints() != null && !original.getWaypoints().isEmpty()) {
            for (Waypoint origWp : original.getWaypoints()) {
                Waypoint wpCopy = Waypoint.builder()
                        .mission(savedCopy)
                        .sequence(origWp.getSequence())
                        .name(origWp.getName())
                        .latitude(origWp.getLatitude())
                        .longitude(origWp.getLongitude())
                        .altitude(origWp.getAltitude())
                        .actions(origWp.getActions() != null ? new HashMap<>(origWp.getActions()) : null)
                        .conditions(origWp.getConditions() != null ? new HashMap<>(origWp.getConditions()) : null)
                        .build();
                savedCopy.addWaypoint(wpCopy);
            }
            missionRepository.save(savedCopy);
        }

        return getMissionById(savedCopy.getId());
    }

    private MissionVm toEnrichedMissionVm(Mission mission, HubBriefVm depHub, HubBriefVm arrHub, Double estimatedDistance) {
        MissionVm base = missionMapper.toVm(mission);
        int wpCount = mission.getWaypoints() != null ? mission.getWaypoints().size() : 0;
        List<WaypointVm> waypoints = mission.getWaypoints() != null ? waypointMapper.toVmList(mission.getWaypoints()) : List.of();

        return new MissionVm(
                base.id(),
                base.name(),
                base.description(),
                base.departureHubId(),
                base.arrivalHubId(),
                base.scheduleType(),
                base.scheduledAt(),
                base.status(),
                wpCount,
                estimatedDistance,
                waypoints,
                depHub,
                arrHub,
                base.createdOn(),
                base.createdBy(),
                base.lastModifiedOn(),
                base.lastModifiedBy()
        );
    }

    private double calculateEstimatedDistance(List<Waypoint> waypoints) {
        if (waypoints == null || waypoints.size() < 2) {
            return 0.0;
        }
        double totalDistance = 0.0;
        for (int i = 0; i < waypoints.size() - 1; i++) {
            Waypoint w1 = waypoints.get(i);
            Waypoint w2 = waypoints.get(i + 1);
            if (w1.getLatitude() != null && w1.getLongitude() != null
                    && w2.getLatitude() != null && w2.getLongitude() != null) {
                totalDistance += haversine(w1.getLatitude(), w1.getLongitude(), w2.getLatitude(), w2.getLongitude());
            }
        }
        return Math.round(totalDistance * 100.0) / 100.0;
    }

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0);
        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        return R * c;
    }
}
