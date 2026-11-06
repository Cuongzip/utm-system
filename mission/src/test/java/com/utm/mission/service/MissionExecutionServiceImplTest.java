package com.utm.mission.service;

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
import com.utm.mission.service.client.DroneClientService;
import com.utm.mission.service.client.FlightClientService;
import com.utm.mission.viewmodel.client.DroneBriefVm;
import com.utm.mission.viewmodel.client.FlightBriefVm;
import com.utm.mission.viewmodel.client.FlightCreateRequestVm;
import com.utm.mission.viewmodel.execution.MissionExecutePostVm;
import com.utm.mission.viewmodel.execution.MissionExecutionResultVm;
import com.utm.mission.viewmodel.execution.MissionExecutionVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: MissionExecutionServiceImpl (Specification-Driven)")
class MissionExecutionServiceImplTest {

    @Mock
    private MissionRepository missionRepository;

    @Mock
    private WaypointRepository waypointRepository;

    @Mock
    private MissionExecutionRepository missionExecutionRepository;

    @Mock
    private MissionExecutionMapper missionExecutionMapper;

    @Mock
    private DroneClientService droneClientService;

    @Mock
    private FlightClientService flightClientService;

    @InjectMocks
    private MissionExecutionServiceImpl missionExecutionService;

    private static final String MISSION_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
    private static final String DRONE_ID = "drone-123-uuid";
    private static final String PILOT_ID = "PILOT-VN-007";
    private static final String EXECUTION_ID = "exec-456-uuid";

    private Mission draftMission;
    private List<Waypoint> waypoints;
    private MissionExecution executionEntity;
    private MissionExecutionVm executionVm;

    @BeforeEach
    void setUp() {
        draftMission = Mission.builder()
                .id(MISSION_ID)
                .name("Supply Mission")
                .departureHubId("dep-hub")
                .arrivalHubId("arr-hub")
                .status(MissionStatus.DRAFT)
                .waypoints(new ArrayList<>())
                .build();

        Waypoint w1 = Waypoint.builder()
                .id("wp-1")
                .sequence(1)
                .latitude(10.7769)
                .longitude(106.7009)
                .altitude(50.0)
                .build();

        Waypoint w2 = Waypoint.builder()
                .id("wp-2")
                .sequence(2)
                .latitude(10.7554)
                .longitude(106.6598)
                .altitude(80.0)
                .build();

        waypoints = List.of(w1, w2);

        executionEntity = MissionExecution.builder()
                .id(EXECUTION_ID)
                .missionId(MISSION_ID)
                .currentWaypointIndex(0)
                .totalWaypoints(2)
                .completedWaypoints(0)
                .startedAt(ZonedDateTime.now())
                .status(ExecutionStatus.IN_PROGRESS)
                .build();

        executionVm = new MissionExecutionVm(
                EXECUTION_ID,
                MISSION_ID,
                0,
                2,
                0,
                executionEntity.getStartedAt(),
                null,
                ExecutionStatus.IN_PROGRESS,
                executionEntity.getStartedAt(),
                "pilot-user"
        );
    }

    @Test
    @DisplayName("executeMission - when valid with available drone starts execution, creates flight and sets executing")
    void executeMission_whenValidWithAvailableDrone_shouldStartExecutionAndCreateFlight() {
        MissionExecutePostVm postVm = new MissionExecutePostVm(DRONE_ID, PILOT_ID);
        DroneBriefVm availableDrone = new DroneBriefVm(DRONE_ID, "VN-D001", "available", "hub-1");
        FlightBriefVm flightVm = new FlightBriefVm("fl-uuid", "FL-1234567890", DRONE_ID, PILOT_ID, "planned", "pending");

        when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(draftMission));
        when(waypointRepository.findByMissionIdOrderBySequenceAsc(MISSION_ID)).thenReturn(waypoints);
        when(droneClientService.getDroneById(DRONE_ID)).thenReturn(Optional.of(availableDrone));
        when(missionExecutionMapper.toEntity(postVm, MISSION_ID, 2)).thenReturn(executionEntity);
        when(missionExecutionRepository.saveAndFlush(executionEntity)).thenReturn(executionEntity);
        when(flightClientService.createFlight(any(FlightCreateRequestVm.class))).thenReturn(Optional.of(flightVm));
        when(missionExecutionMapper.toVm(executionEntity)).thenReturn(executionVm);

        MissionExecutionResultVm result = missionExecutionService.executeMission(MISSION_ID, postVm);

        assertThat(result).isNotNull();
        assertThat(result.execution().id()).isEqualTo(EXECUTION_ID);
        assertThat(result.execution().totalWaypoints()).isEqualTo(2);
        assertThat(result.flight().flightNumber()).isEqualTo("FL-1234567890");
        assertThat(result.flight().droneId()).isEqualTo(DRONE_ID);

        assertThat(draftMission.getStatus()).isEqualTo(MissionStatus.EXECUTING);
        verify(missionRepository).saveAndFlush(draftMission);
    }

    @Test
    @DisplayName("executeMission - when drone is idle proceeds successfully")
    void executeMission_whenDroneIsIdle_shouldProceedSuccessfully() {
        MissionExecutePostVm postVm = new MissionExecutePostVm(DRONE_ID, PILOT_ID);
        DroneBriefVm idleDrone = new DroneBriefVm(DRONE_ID, "VN-D001", "idle", "hub-1");

        when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(draftMission));
        when(waypointRepository.findByMissionIdOrderBySequenceAsc(MISSION_ID)).thenReturn(waypoints);
        when(droneClientService.getDroneById(DRONE_ID)).thenReturn(Optional.of(idleDrone));
        when(missionExecutionMapper.toEntity(postVm, MISSION_ID, 2)).thenReturn(executionEntity);
        when(missionExecutionRepository.saveAndFlush(executionEntity)).thenReturn(executionEntity);
        when(flightClientService.createFlight(any(FlightCreateRequestVm.class))).thenReturn(Optional.empty());
        when(missionExecutionMapper.toVm(executionEntity)).thenReturn(executionVm);

        MissionExecutionResultVm result = missionExecutionService.executeMission(MISSION_ID, postVm);

        assertThat(result).isNotNull();
        assertThat(result.flight()).isNotNull();
        assertThat(result.flight().droneId()).isEqualTo(DRONE_ID);
        assertThat(result.flight().status()).isEqualTo("planned");
        assertThat(draftMission.getStatus()).isEqualTo(MissionStatus.EXECUTING);
    }

    @Test
    @DisplayName("executeMission - when mission status is already executing throws BadRequestException")
    void executeMission_whenMissionStatusInvalid_shouldThrowBadRequestException() {
        draftMission.setStatus(MissionStatus.EXECUTING);
        when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(draftMission));

        MissionExecutePostVm postVm = new MissionExecutePostVm(DRONE_ID, PILOT_ID);

        assertThatThrownBy(() -> missionExecutionService.executeMission(MISSION_ID, postVm))
                .isInstanceOf(BadRequestException.class);

        verify(missionExecutionRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("executeMission - when mission has fewer than 2 waypoints throws BadRequestException")
    void executeMission_whenFewerThanTwoWaypoints_shouldThrowBadRequestException() {
        when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(draftMission));
        when(waypointRepository.findByMissionIdOrderBySequenceAsc(MISSION_ID))
                .thenReturn(List.of(waypoints.get(0)));

        MissionExecutePostVm postVm = new MissionExecutePostVm(DRONE_ID, PILOT_ID);

        assertThatThrownBy(() -> missionExecutionService.executeMission(MISSION_ID, postVm))
                .isInstanceOf(BadRequestException.class);

        verify(droneClientService, never()).getDroneById(any());
        verify(missionExecutionRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("executeMission - when drone is not available or idle throws BadRequestException")
    void executeMission_whenDroneNotAvailable_shouldThrowBadRequestException() {
        MissionExecutePostVm postVm = new MissionExecutePostVm(DRONE_ID, PILOT_ID);
        DroneBriefVm busyDrone = new DroneBriefVm(DRONE_ID, "VN-D001", "in_flight", "hub-1");

        when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(draftMission));
        when(waypointRepository.findByMissionIdOrderBySequenceAsc(MISSION_ID)).thenReturn(waypoints);
        when(droneClientService.getDroneById(DRONE_ID)).thenReturn(Optional.of(busyDrone));

        assertThatThrownBy(() -> missionExecutionService.executeMission(MISSION_ID, postVm))
                .isInstanceOf(BadRequestException.class);

        verify(missionExecutionRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("executeMission - when mission not found throws NotFoundException")
    void executeMission_whenMissionNotFound_shouldThrowNotFoundException() {
        when(missionRepository.findById("unknown-mission")).thenReturn(Optional.empty());

        MissionExecutePostVm postVm = new MissionExecutePostVm(DRONE_ID, PILOT_ID);

        assertThatThrownBy(() -> missionExecutionService.executeMission("unknown-mission", postVm))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("getExecutionById - when found returns mapped execution VM")
    void getExecutionById_whenFound_shouldReturnVm() {
        when(missionExecutionRepository.findById(EXECUTION_ID)).thenReturn(Optional.of(executionEntity));
        when(missionExecutionMapper.toVm(executionEntity)).thenReturn(executionVm);

        MissionExecutionVm result = missionExecutionService.getExecutionById(EXECUTION_ID);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(EXECUTION_ID);
        assertThat(result.missionId()).isEqualTo(MISSION_ID);
        assertThat(result.status()).isEqualTo(ExecutionStatus.IN_PROGRESS);
    }

    @Test
    @DisplayName("getExecutionById - when not found throws NotFoundException")
    void getExecutionById_whenNotFound_shouldThrowNotFoundException() {
        when(missionExecutionRepository.findById("unknown-exec")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> missionExecutionService.getExecutionById("unknown-exec"))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("getExecutionsByMissionId - returns list of executions ordered by startedAt desc")
    void getExecutionsByMissionId_shouldReturnListOrderedByStartedAtDesc() {
        when(missionExecutionRepository.findByMissionIdOrderByStartedAtDesc(MISSION_ID))
                .thenReturn(List.of(executionEntity));
        when(missionExecutionMapper.toVmList(List.of(executionEntity)))
                .thenReturn(List.of(executionVm));

        List<MissionExecutionVm> result = missionExecutionService.getExecutionsByMissionId(MISSION_ID);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(EXECUTION_ID);
    }
}
