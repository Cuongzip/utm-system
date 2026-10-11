package com.utm.mission.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.mission.mapper.MissionExecutionMapper;
import com.utm.mission.model.Mission;
import com.utm.mission.model.MissionExecution;
import com.utm.mission.model.Waypoint;
import com.utm.mission.model.enumeration.ExecutionStatus;
import com.utm.mission.model.enumeration.MissionStatus;
import com.utm.mission.repository.MissionExecutionRepository;
import com.utm.mission.repository.MissionRepository;
import com.utm.mission.repository.WaypointRepository;
import com.utm.mission.viewmodel.DroneBriefVm;
import com.utm.mission.viewmodel.FlightBriefVm;
import com.utm.mission.viewmodel.FlightCreateRequestVm;
import com.utm.mission.viewmodel.FlightWaypointPayloadVm;
import com.utm.mission.viewmodel.MissionExecutePostVm;
import com.utm.mission.viewmodel.MissionExecutionResultVm;
import com.utm.mission.viewmodel.MissionExecutionVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class MissionExecutionServiceImpl implements MissionExecutionService {

    private final MissionRepository missionRepository;
    private final WaypointRepository waypointRepository;
    private final MissionExecutionRepository missionExecutionRepository;
    private final MissionExecutionMapper missionExecutionMapper;
    private final DroneClientService droneClientService;
    private final FlightClientService flightClientService;

    @Override
    @Transactional
    public MissionExecutionResultVm executeMission(String missionId, MissionExecutePostVm postVm) {
        Mission mission = missionRepository.findById(missionId)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, missionId));

        if (mission.getStatus() != MissionStatus.DRAFT && mission.getStatus() != MissionStatus.SCHEDULED) {
            throw new BadRequestException(MessageCode.CANNOT_EDIT_EXECUTING_MISSION,
                    "Mission must be in draft or scheduled state to be executed");
        }

        List<Waypoint> waypoints = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
        if (waypoints.size() < 2) {
            throw new BadRequestException(MessageCode.MISSION_WAYPOINTS_LESS_THAN_TWO,
                    "Mission must have at least 2 waypoints to execute");
        }

        String droneId = postVm.droneId().trim();
        Optional<DroneBriefVm> droneOpt = droneClientService.getDroneById(droneId);
        if (droneOpt.isPresent()) {
            DroneBriefVm drone = droneOpt.get();
            if (drone.status() != null && !"available".equalsIgnoreCase(drone.status()) && !"idle".equalsIgnoreCase(drone.status())) {
                throw new BadRequestException(MessageCode.DRONE_NOT_AVAILABLE, droneId);
            }
        }

        MissionExecution execution = missionExecutionMapper.toEntity(postVm, missionId, waypoints.size());
        MissionExecution savedExecution = missionExecutionRepository.saveAndFlush(execution);

        List<FlightWaypointPayloadVm> flightWaypoints = waypoints.stream()
                .map(wp -> new FlightWaypointPayloadVm(
                        wp.getLatitude(),
                        wp.getLongitude(),
                        wp.getAltitude() != null ? wp.getAltitude() : 50.0,
                        15.0
                ))
                .toList();

        Double cruisingAlt = waypoints.stream()
                .map(Waypoint::getAltitude)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .max()
                .orElse(50.0);

        String flightNumber = "FL-" + System.currentTimeMillis();

        FlightCreateRequestVm flightReq = new FlightCreateRequestVm(
                flightNumber,
                droneId,
                mission.getDepartureHubId(),
                mission.getArrivalHubId(),
                postVm.pilotId().trim(),
                ZonedDateTime.now(),
                ZonedDateTime.now().plusHours(1),
                cruisingAlt,
                "Generated from mission: " + mission.getName(),
                savedExecution.getId(),
                flightWaypoints
        );

        FlightBriefVm flightVm = flightClientService.createFlight(flightReq)
                .orElseGet(() -> new FlightBriefVm(
                        null,
                        flightNumber,
                        droneId,
                        postVm.pilotId().trim(),
                        "planned",
                        "pending"
                ));

        mission.setStatus(MissionStatus.EXECUTING);
        missionRepository.saveAndFlush(mission);

        log.info("Mission ID: {} executed successfully. Execution ID: {}, Flight Number: {}",
                missionId, savedExecution.getId(), flightNumber);

        MissionExecutionVm executionVm = missionExecutionMapper.toVm(savedExecution);
        return new MissionExecutionResultVm(executionVm, flightVm);
    }

    @Override
    @Transactional(readOnly = true)
    public MissionExecutionVm getExecutionById(String id) {
        MissionExecution execution = missionExecutionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_EXECUTION_NOT_FOUND, id));
        return missionExecutionMapper.toVm(execution);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MissionExecutionVm> getExecutionsByMissionId(String missionId) {
        return missionExecutionMapper.toVmList(
                missionExecutionRepository.findByMissionIdOrderByStartedAtDesc(missionId)
        );
    }
}
