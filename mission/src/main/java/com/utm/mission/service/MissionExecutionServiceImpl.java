package com.utm.mission.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.generator.BusinessCodeGenerator;
import com.utm.commonlibrary.generator.CodePatternRule;
import com.utm.mission.mapper.MissionExecutionMapper;
import com.utm.mission.model.Mission;
import com.utm.mission.model.MissionExecution;
import com.utm.mission.model.Waypoint;
import com.utm.mission.model.enumeration.MissionStatus;
import com.utm.mission.repository.MissionExecutionRepository;
import com.utm.mission.repository.MissionRepository;
import com.utm.mission.repository.WaypointRepository;
import com.utm.mission.service.client.DroneClientService;
import com.utm.mission.service.client.FlightClientService;
import com.utm.mission.service.fleet.FleetScoringService;
import com.utm.mission.util.GeoUtils;
import com.utm.mission.viewmodel.client.DroneBriefVm;
import com.utm.mission.viewmodel.client.FlightBriefVm;
import com.utm.mission.viewmodel.client.FlightCreateRequestVm;
import com.utm.mission.viewmodel.client.FlightWaypointPayloadVm;
import com.utm.mission.viewmodel.execution.MissionExecutePostVm;
import com.utm.mission.viewmodel.execution.MissionExecutionResultVm;
import com.utm.mission.viewmodel.execution.MissionExecutionVm;
import com.utm.mission.viewmodel.fleet.ScoredDroneCandidateVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

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
        private final FleetScoringService fleetScoringService;

        private record FlightLeg(
                        String departureHubId,
                        String arrivalHubId,
                        List<Waypoint> waypoints) {
        }

        @Override
        @Transactional
        public MissionExecutionResultVm executeMission(String missionId, MissionExecutePostVm postVm) {
                Mission mission = missionRepository.findById(missionId)
                                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_NOT_FOUND, "id",
                                                missionId));

                if (mission.getStatus() != MissionStatus.DRAFT && mission.getStatus() != MissionStatus.SCHEDULED) {
                        throw new BadRequestException(MessageCode.CANNOT_EDIT_EXECUTING_MISSION,
                                        "Mission must be in draft or scheduled state to be executed");
                }

                List<Waypoint> waypoints = waypointRepository.findByMissionIdOrderBySequenceAsc(missionId);
                if (waypoints.size() < 2) {
                        throw new BadRequestException(MessageCode.MISSION_WAYPOINTS_LESS_THAN_TWO,
                                        "Mission must have at least 2 waypoints to execute");
                }

                String droneId;
                if (Boolean.TRUE.equals(postVm.autoAssign()) || postVm.droneId() == null
                                || postVm.droneId().isBlank()) {
                        ScoredDroneCandidateVm bestCandidate = fleetScoringService.getBestCandidate(missionId);
                        droneId = bestCandidate.droneId();
                        log.info("Auto-assigned candidate drone {} ({}) with score {} for mission {}",
                                        droneId, bestCandidate.registrationNumber(), bestCandidate.finalScore(),
                                        missionId);
                } else {
                        droneId = postVm.droneId().trim();
                        DroneBriefVm drone = droneClientService.getDroneById(droneId)
                                        .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id",
                                                        droneId));
                        if (drone.status() != null && !"available".equalsIgnoreCase(drone.status())
                                        && !"idle".equalsIgnoreCase(drone.status())) {
                                throw new BadRequestException(MessageCode.DRONE_NOT_AVAILABLE, "registrationNumber",
                                                drone.registrationNumber() != null ? drone.registrationNumber()
                                                                : droneId);
                        }
                        if (drone.maxPayload() != null && mission.getPayloadWeightKg() != null
                                        && drone.maxPayload() < mission.getPayloadWeightKg()) {
                                throw new BadRequestException(MessageCode.DRONE_NOT_AVAILABLE,
                                                "registrationNumber",
                                                drone.registrationNumber() != null ? drone.registrationNumber()
                                                                : droneId,
                                                "reason",
                                                String.format("Drone max payload (%.1f kg) is less than mission required payload (%.1f kg)",
                                                                drone.maxPayload(), mission.getPayloadWeightKg()));
                        }
                }

                MissionExecution execution = missionExecutionMapper.toEntity(postVm, missionId, waypoints.size());
                MissionExecution savedExecution = missionExecutionRepository.saveAndFlush(execution);

                List<FlightLeg> legs = decomposeIntoLegs(mission, waypoints);
                List<FlightBriefVm> createdFlights = new ArrayList<>();

                ZonedDateTime currentDepartureTime = mission.getScheduledAt() != null
                                && mission.getScheduledAt().isAfter(ZonedDateTime.now())
                                                ? mission.getScheduledAt()
                                                : ZonedDateTime.now();

                for (int legIndex = 0; legIndex < legs.size(); legIndex++) {
                        FlightLeg leg = legs.get(legIndex);
                        double legDistanceMeters = GeoUtils.calculateTotalDistance(leg.waypoints());
                        long flightDurationSeconds = Math.max(600L,
                                        (long) (legDistanceMeters / 15.0) + (leg.waypoints().size() * 10L));
                        ZonedDateTime scheduledArrival = currentDepartureTime.plusSeconds(flightDurationSeconds);

                        Double cruisingAlt = leg.waypoints().stream()
                                        .map(Waypoint::getAltitude)
                                        .filter(Objects::nonNull)
                                        .mapToDouble(Double::doubleValue)
                                        .max()
                                        .orElse(50.0);

                        List<FlightWaypointPayloadVm> flightWaypoints = leg.waypoints().stream()
                                        .map(wp -> new FlightWaypointPayloadVm(
                                                        wp.getSequence(),
                                                        wp.getName(),
                                                        wp.getLatitude(),
                                                        wp.getLongitude(),
                                                        wp.getAltitude() != null ? wp.getAltitude() : 50.0,
                                                        wp.getActions(),
                                                        wp.getConditions()))
                                        .toList();

                        String flightNumber = BusinessCodeGenerator.generate(CodePatternRule.FLIGHT_NUMBER);
                        String notes = String.format("Generated from mission: %s (Leg %d/%d)", mission.getName(),
                                        legIndex + 1, legs.size());

                        FlightCreateRequestVm flightReq = new FlightCreateRequestVm(
                                        flightNumber,
                                        droneId,
                                        leg.departureHubId(),
                                        leg.arrivalHubId(),
                                        postVm.pilotId().trim(),
                                        currentDepartureTime,
                                        scheduledArrival,
                                        cruisingAlt,
                                        notes,
                                        savedExecution.getId(),
                                        flightWaypoints);

                        FlightBriefVm flightVm = flightClientService.createFlight(flightReq)
                                        .orElseThrow(() -> new BadRequestException(MessageCode.FLIGHT_CREATION_FAILED,
                                                        "flightNumber", flightNumber));

                        createdFlights.add(flightVm);
                        log.info("Created flight {} for mission {} (Leg {}/{})", flightNumber, missionId, legIndex + 1,
                                        legs.size());

                        // Turnaround / battery swap buffer between legs: 30 minutes
                        currentDepartureTime = scheduledArrival.plusMinutes(30);
                }

                mission.setStatus(MissionStatus.EXECUTING);
                missionRepository.saveAndFlush(mission);

                log.info("Mission ID: {} executed successfully with {} flight leg(s). Execution ID: {}",
                                missionId, createdFlights.size(), savedExecution.getId());

                MissionExecutionVm executionVm = missionExecutionMapper.toVm(savedExecution);
                FlightBriefVm primaryFlight = createdFlights.isEmpty() ? null : createdFlights.get(0);
                return new MissionExecutionResultVm(executionVm, primaryFlight, createdFlights);
        }

        private List<FlightLeg> decomposeIntoLegs(Mission mission, List<Waypoint> waypoints) {
                return List.of(new FlightLeg(mission.getDepartureHubId(), mission.getArrivalHubId(), waypoints));
        }

        @Override
        @Transactional(readOnly = true)
        public MissionExecutionVm getExecutionById(String id) {
                MissionExecution execution = missionExecutionRepository.findById(id)
                                .orElseThrow(() -> new NotFoundException(MessageCode.MISSION_EXECUTION_NOT_FOUND, "id",
                                                id));
                return missionExecutionMapper.toVm(execution);
        }

        @Override
        @Transactional(readOnly = true)
        public List<MissionExecutionVm> getExecutionsByMissionId(String missionId) {
                return missionExecutionMapper.toVmList(
                                missionExecutionRepository.findByMissionIdOrderByStartedAtDesc(missionId));
        }
}
