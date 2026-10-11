package com.utm.mission.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.mission.mapper.WaypointMapper;
import com.utm.mission.model.Mission;
import com.utm.mission.model.Waypoint;
import com.utm.mission.model.enumeration.MissionStatus;
import com.utm.mission.repository.MissionRepository;
import com.utm.mission.repository.WaypointRepository;
import com.utm.mission.viewmodel.WaypointPostVm;
import com.utm.mission.viewmodel.WaypointPutVm;
import com.utm.mission.viewmodel.WaypointReorderItemVm;
import com.utm.mission.viewmodel.WaypointReorderVm;
import com.utm.mission.viewmodel.WaypointVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WaypointServiceImpl implements WaypointService {

    private final MissionRepository missionRepository;
    private final WaypointRepository waypointRepository;
    private final WaypointMapper waypointMapper;
    private final AirspaceClientService airspaceClientService;

    @Override
    @Transactional
    public WaypointVm addWaypoint(String missionId, WaypointPostVm postVm) {
        Mission mission = findDraftMissionOrThrow(missionId);
        int nextSeq = waypointRepository.findMaxSequenceByMissionId(missionId) + 1;
        Optional<String> safetyWarning = airspaceClientService.checkPointSafety(postVm.latitude(), postVm.longitude(), postVm.altitude());

        Waypoint waypoint = waypointMapper.toEntity(postVm);
        waypoint.setMission(mission);
        waypoint.setSequence(nextSeq);

        Waypoint saved = waypointRepository.save(waypoint);
        return waypointMapper.toVm(saved, safetyWarning.orElse(null));
    }

    @Override
    @Transactional(readOnly = true)
    public List<WaypointVm> getWaypoints(String missionId) {
        if (!missionRepository.existsById(missionId)) {
            throw new NotFoundException(MessageCode.MISSION_NOT_FOUND, missionId);
        }
        List<Waypoint> waypoints = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
        return waypointMapper.toVmList(waypoints);
    }

    @Override
    @Transactional
    public WaypointVm updateWaypoint(String missionId, String waypointId, WaypointPutVm putVm) {
        findDraftMissionOrThrow(missionId);

        Waypoint waypoint = waypointRepository.findByIdAndMissionId(waypointId, missionId)
                .orElseThrow(() -> new NotFoundException(MessageCode.WAYPOINT_NOT_FOUND, waypointId));

        waypointMapper.updateEntityFromVm(putVm, waypoint);

        Optional<String> safetyWarning = airspaceClientService.checkPointSafety(
                waypoint.getLatitude(),
                waypoint.getLongitude(),
                waypoint.getAltitude()
        );

        Waypoint saved = waypointRepository.save(waypoint);
        return waypointMapper.toVm(saved, safetyWarning.orElse(null));
    }

    @Override
    @Transactional
    public void deleteWaypoint(String missionId, String waypointId) {
        findDraftMissionOrThrow(missionId);

        Waypoint waypoint = waypointRepository.findByIdAndMissionId(waypointId, missionId)
                .orElseThrow(() -> new NotFoundException(MessageCode.WAYPOINT_NOT_FOUND, waypointId));

        waypointRepository.delete(waypoint);

        List<Waypoint> remaining = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
        int seq = 1;
        for (Waypoint w : remaining) {
            if (!w.getId().equals(waypointId)) {
                w.setSequence(seq++);
            }
        }
        waypointRepository.saveAll(remaining);
    }

    @Override
    @Transactional
    public List<WaypointVm> reorderWaypoints(String missionId, WaypointReorderVm reorderVm) {
        findDraftMissionOrThrow(missionId);

        List<Waypoint> existingWaypoints = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
        Map<String, Waypoint> waypointMap = existingWaypoints.stream()
                .collect(Collectors.toMap(Waypoint::getId, w -> w));

        if (reorderVm.order().size() != existingWaypoints.size()) {
            throw new BadRequestException(MessageCode.WAYPOINT_REORDER_INVALID);
        }

        Set<Integer> assignedSequences = new HashSet<>();
        for (WaypointReorderItemVm item : reorderVm.order()) {
            if (!waypointMap.containsKey(item.waypointId())) {
                throw new BadRequestException(MessageCode.WAYPOINT_REORDER_INVALID);
            }
            if (!assignedSequences.add(item.sequence())) {
                throw new BadRequestException(MessageCode.WAYPOINT_REORDER_INVALID);
            }
        }

        for (WaypointReorderItemVm item : reorderVm.order()) {
            Waypoint wp = waypointMap.get(item.waypointId());
            wp.setSequence(item.sequence());
        }

        waypointRepository.saveAll(existingWaypoints);

        List<Waypoint> sorted = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
        return waypointMapper.toVmList(sorted);
    }

    private Mission findDraftMissionOrThrow(String missionId) {
        Mission mission = missionRepository.findById(missionId)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, missionId));

        if (mission.getStatus() != MissionStatus.DRAFT) {
            throw new BadRequestException(MessageCode.MISSION_NOT_IN_DRAFT_STATUS);
        }
        return mission;
    }
}
