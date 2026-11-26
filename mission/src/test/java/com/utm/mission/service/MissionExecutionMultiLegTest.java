package com.utm.mission.service;

import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.mission.mapper.MissionExecutionMapper;
import com.utm.mission.model.Mission;
import com.utm.mission.model.MissionExecution;
import com.utm.mission.model.MissionExecutionLeg;
import com.utm.mission.model.Waypoint;
import com.utm.mission.model.enumeration.ExecutionMode;
import com.utm.mission.model.enumeration.ExecutionStatus;
import com.utm.mission.model.enumeration.LegStatus;
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
import com.utm.mission.viewmodel.client.DroneBriefVm;
import com.utm.mission.viewmodel.client.FlightBriefVm;
import com.utm.mission.viewmodel.client.FlightCreateRequestVm;
import com.utm.mission.viewmodel.client.HubBriefVm;
import com.utm.mission.viewmodel.execution.LegDroneAssignmentVm;
import com.utm.mission.viewmodel.execution.MissionExecutePostVm;
import com.utm.mission.viewmodel.execution.MissionExecutionPlanVm;
import com.utm.mission.viewmodel.execution.MissionExecutionResultVm;
import com.utm.mission.viewmodel.execution.MissionExecutionVm;
import com.utm.mission.viewmodel.fleet.ScoredDroneCandidateVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: MissionExecutionServiceImpl Multi-Leg, Saga Rollback & Event Rollup")
class MissionExecutionMultiLegTest {

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
    @Mock
    private FleetScoringService fleetScoringService;
    @Mock
    private MissionExecutionLegRepository missionExecutionLegRepository;
    @Mock
    private HubClientService hubClientService;
    @Mock
    private AirspaceClientService airspaceClientService;

    @InjectMocks
    private MissionExecutionServiceImpl service;

    private Mission multiLegMission;
    private List<Waypoint> waypoints;

    @BeforeEach
    void setUp() {
        multiLegMission = Mission.builder()
                .id("m-multi-01")
                .name("Multi-Hub Medical Relay")
                .departureHubId("hub-a")
                .arrivalHubId("hub-c")
                .payloadWeightKg(2.0)
                .status(MissionStatus.SCHEDULED)
                .build();

        waypoints = List.of(
                Waypoint.builder().id("wp-1").sequence(1).latitude(10.7700).longitude(106.7000).altitude(60.0)
                        .stopoverType(StopoverType.NONE).build(),
                Waypoint.builder().id("wp-2").sequence(2).latitude(10.7900).longitude(106.7200).altitude(60.0)
                        .hubId("hub-b").stopoverType(StopoverType.RECHARGE).groundTimeMinutes(20).build(),
                Waypoint.builder().id("wp-3").sequence(3).latitude(10.8100).longitude(106.7400).altitude(60.0)
                        .stopoverType(StopoverType.NONE).build());
    }

    @Test
    @DisplayName("executeMission in MULTI_DRONE_RELAY creates 2 sequential dependent flights with separate drones")
    void executeMission_multiDroneRelay_createsTwoLinkedFlights() {
        DroneBriefVm drone1 = new DroneBriefVm("drone-1", "VN-001", "available", "hub-a");
        DroneBriefVm drone2 = new DroneBriefVm("drone-2", "VN-002", "available", "hub-b");
        MissionExecution execution = MissionExecution.builder()
                .id("exec-relay-1")
                .missionId("m-multi-01")
                .pilotId("pilot-1")
                .startedAt(ZonedDateTime.now())
                .status(ExecutionStatus.IN_PROGRESS)
                .build();
        MissionExecutePostVm postVm = new MissionExecutePostVm(
                null,
                "pilot-1",
                false,
                ExecutionMode.MULTI_DRONE_RELAY,
                List.of(
                        new LegDroneAssignmentVm(0, "drone-1"),
                        new LegDroneAssignmentVm(1, "drone-2")),
                false);

        when(missionRepository.findById("m-multi-01")).thenReturn(Optional.of(multiLegMission));
        when(waypointRepository.findByMissionIdOrderBySequenceAsc("m-multi-01")).thenReturn(waypoints);
        when(droneClientService.getDroneById("drone-1")).thenReturn(Optional.of(drone1));
        when(droneClientService.getDroneById("drone-2")).thenReturn(Optional.of(drone2));
        when(missionExecutionMapper.toEntity(postVm, "m-multi-01")).thenReturn(execution);
        when(missionExecutionRepository.saveAndFlush(any(MissionExecution.class))).thenReturn(execution);
        when(flightClientService.createFlight(any(FlightCreateRequestVm.class)))
                .thenReturn(Optional.of(new FlightBriefVm("flt-leg-0", "FLT-0", "drone-1", "pilot-1", "scheduled", "pending")))
                .thenReturn(Optional.of(new FlightBriefVm("flt-leg-1", "FLT-1", "drone-2", "pilot-1", "scheduled", "pending")));
        when(missionExecutionMapper.toLegEntity(any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenAnswer(inv -> MissionExecutionLeg.builder()
                        .executionId(inv.getArgument(0))
                        .legIndex(inv.getArgument(1))
                        .flightId(inv.getArgument(2))
                        .droneId(inv.getArgument(3))
                        .build());
        when(missionExecutionMapper.toVm(any(MissionExecution.class), anyList()))
                .thenReturn(mock(MissionExecutionVm.class));

        MissionExecutionResultVm result = service.executeMission("m-multi-01", postVm);

        assertThat(result).isNotNull();
        assertThat(result.flights()).hasSize(2);
        assertThat(result.flights().get(0).id()).isEqualTo("flt-leg-0");
        assertThat(result.flights().get(1).id()).isEqualTo("flt-leg-1");
        assertThat(execution.getTotalLegs()).isEqualTo(2);
        assertThat(execution.getExecutionMode()).isEqualTo(ExecutionMode.MULTI_DRONE_RELAY);

        ArgumentCaptor<FlightCreateRequestVm> flightReqCaptor = ArgumentCaptor.forClass(FlightCreateRequestVm.class);
        verify(flightClientService, times(2)).createFlight(flightReqCaptor.capture());
        List<FlightCreateRequestVm> requests = flightReqCaptor.getAllValues();
        assertThat(requests.get(0).droneId()).isEqualTo("drone-1");
        assertThat(requests.get(0).dependsOnFlightId()).isNull();
        assertThat(requests.get(1).droneId()).isEqualTo("drone-2");
        assertThat(requests.get(1).dependsOnFlightId()).isEqualTo("flt-leg-0");
    }

    @Test
    @DisplayName("executeMission triggers Saga compensation to abort Leg 0 flight when Leg 1 creation fails")
    void executeMission_whenSecondLegCreationFails_compensatesFirstFlight() {
        DroneBriefVm drone1 = new DroneBriefVm("drone-1", "VN-001", "available", "hub-a");
        MissionExecution execution = MissionExecution.builder()
                .id("exec-saga-1")
                .missionId("m-multi-01")
                .pilotId("pilot-1")
                .startedAt(ZonedDateTime.now())
                .status(ExecutionStatus.IN_PROGRESS)
                .build();
        MissionExecutePostVm postVm = new MissionExecutePostVm("drone-1", "pilot-1");

        when(missionRepository.findById("m-multi-01")).thenReturn(Optional.of(multiLegMission));
        when(waypointRepository.findByMissionIdOrderBySequenceAsc("m-multi-01")).thenReturn(waypoints);
        when(droneClientService.getDroneById("drone-1")).thenReturn(Optional.of(drone1));
        when(missionExecutionMapper.toEntity(postVm, "m-multi-01")).thenReturn(execution);
        when(missionExecutionRepository.saveAndFlush(any(MissionExecution.class))).thenReturn(execution);
        when(flightClientService.createFlight(any(FlightCreateRequestVm.class)))
                .thenReturn(Optional.of(new FlightBriefVm("flt-leg-0", "FLT-0", "drone-1", "pilot-1", "scheduled", "pending")))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.executeMission("m-multi-01", postVm))
                .isInstanceOf(BadRequestException.class);

        verify(flightClientService).abortFlight(eq("flt-leg-0"), anyString());
        verify(missionExecutionRepository).delete(execution);
    }

    @Test
    @DisplayName("handleFlightLifecycleEvent rolls up multi-leg completions and completes parent mission on final leg")
    void handleFlightLifecycleEvent_allLegsCompleted_completesExecutionAndMission() {
        MissionExecution execution = MissionExecution.builder()
                .id("exec-rollup-1")
                .missionId("m-multi-01")
                .status(ExecutionStatus.IN_PROGRESS)
                .totalLegs(2)
                .completedLegs(1)
                .build();
        MissionExecutionLeg leg0 = MissionExecutionLeg.builder()
                .id("leg-0").executionId("exec-rollup-1").legIndex(0).flightId("flt-0")
                .status(LegStatus.COMPLETED).build();
        MissionExecutionLeg leg1 = MissionExecutionLeg.builder()
                .id("leg-1").executionId("exec-rollup-1").legIndex(1).flightId("flt-1")
                .status(LegStatus.ACTIVE).build();

        when(missionExecutionLegRepository.findByFlightId("flt-1")).thenReturn(Optional.of(leg1));
        when(missionExecutionRepository.findById("exec-rollup-1")).thenReturn(Optional.of(execution));
        when(missionExecutionLegRepository.findByExecutionIdOrderByLegIndexAsc("exec-rollup-1"))
                .thenReturn(List.of(leg0, leg1));
        when(missionRepository.findById("m-multi-01")).thenReturn(Optional.of(multiLegMission));

        FlightLifecycleEvent completedEvent = new FlightLifecycleEvent(
                FlightLifecycleEvent.FLIGHT_COMPLETED,
                "flt-1", "FLT-1", "m-multi-01", "exec-rollup-1",
                1, 2, "drone-1", "hub-b", "hub-c", "hub-c",
                "completed", null, 0.25, null, ZonedDateTime.now());

        service.handleFlightLifecycleEvent(completedEvent);

        assertThat(leg1.getStatus()).isEqualTo(LegStatus.COMPLETED);
        assertThat(execution.getStatus()).isEqualTo(ExecutionStatus.COMPLETED);
        assertThat(execution.getCompletedLegs()).isEqualTo(2);
        assertThat(multiLegMission.getStatus()).isEqualTo(MissionStatus.COMPLETED);
        verify(missionExecutionRepository).save(execution);
        verify(missionRepository).save(multiLegMission);
    }

    @Test
    @DisplayName("handleFlightLifecycleEvent persists waypoint progress and logs on FLIGHT_WAYPOINT_REACHED")
    void handleFlightLifecycleEvent_waypointReached_updatesProgressAndLogs() {
        MissionExecution execution = MissionExecution.builder()
                .id("exec-wp-1")
                .missionId("m-multi-01")
                .status(ExecutionStatus.IN_PROGRESS)
                .currentWaypointIndex(0)
                .completedWaypoints(0)
                .build();
        MissionExecutionLeg leg0 = MissionExecutionLeg.builder()
                .id("leg-0").executionId("exec-wp-1").legIndex(0).flightId("flt-0")
                .status(LegStatus.ACTIVE).build();

        when(missionExecutionLegRepository.findByFlightId("flt-0")).thenReturn(Optional.of(leg0));
        when(missionExecutionRepository.findById("exec-wp-1")).thenReturn(Optional.of(execution));

        FlightLifecycleEvent reachedEvent = new FlightLifecycleEvent(
                FlightLifecycleEvent.FLIGHT_WAYPOINT_REACHED,
                "flt-0", "FLT-0", "m-multi-01", "exec-wp-1",
                0, 2, "drone-1", "hub-a", "hub-b", null,
                "active", 2, null, "Reached waypoint #2", ZonedDateTime.now(),
                null, null, true);

        service.handleFlightLifecycleEvent(reachedEvent);

        assertThat(execution.getCurrentWaypointIndex()).isEqualTo(2);
        assertThat(execution.getCompletedWaypoints()).isEqualTo(1);
        assertThat(execution.getWaypointLogs()).hasSize(1);
        assertThat(execution.getWaypointLogs().getFirst().get("waypointIndex")).isEqualTo(2);
        assertThat(execution.getWaypointLogs().getFirst().get("waitForConfirmation")).isEqualTo(true);
        verify(missionExecutionRepository).save(execution);
    }

    @Test
    @DisplayName("handleFlightLifecycleEvent updates downstream leg departureHubId when Leg 0 diverts to alternate hub")
    void handleFlightLifecycleEvent_diverted_syncsDownstreamLegDepartureHub() {
        MissionExecution execution = MissionExecution.builder()
                .id("exec-div-1")
                .missionId("m-multi-01")
                .status(ExecutionStatus.IN_PROGRESS)
                .totalLegs(2)
                .build();
        MissionExecutionLeg leg0 = MissionExecutionLeg.builder()
                .id("leg-0").executionId("exec-div-1").legIndex(0).flightId("flt-0")
                .departureHubId("hub-a").arrivalHubId("hub-b").status(LegStatus.ACTIVE).build();
        MissionExecutionLeg leg1 = MissionExecutionLeg.builder()
                .id("leg-1").executionId("exec-div-1").legIndex(1).flightId("flt-1")
                .departureHubId("hub-b").arrivalHubId("hub-c").status(LegStatus.PLANNED).build();

        when(missionExecutionLegRepository.findByFlightId("flt-0")).thenReturn(Optional.of(leg0));
        when(missionExecutionRepository.findById("exec-div-1")).thenReturn(Optional.of(execution));
        when(missionExecutionLegRepository.findByExecutionIdOrderByLegIndexAsc("exec-div-1"))
                .thenReturn(List.of(leg0, leg1));
        when(missionRepository.findById("m-multi-01")).thenReturn(Optional.of(multiLegMission));

        FlightLifecycleEvent divertedEvent = new FlightLifecycleEvent(
                FlightLifecycleEvent.FLIGHT_DIVERTED,
                "flt-0", "FLT-0", "m-multi-01", "exec-div-1",
                0, 2, "drone-1", "hub-a", "hub-b", "hub-alt-z",
                "diverted", null, null, "Storm front at Hub B", ZonedDateTime.now());

        service.handleFlightLifecycleEvent(divertedEvent);

        assertThat(leg0.getStatus()).isEqualTo(LegStatus.DIVERTED);
        assertThat(leg0.getArrivalHubId()).isEqualTo("hub-alt-z");
        assertThat(leg1.getDepartureHubId()).isEqualTo("hub-alt-z");
        assertThat(execution.getStatus()).isEqualTo(ExecutionStatus.PAUSED);
        verify(flightClientService).updateFlightLegPlan(eq("flt-1"), eq(java.util.Map.of("departureHubId", "hub-alt-z")));
    }

    @Test
    @DisplayName("reassignLegDrone recovers failed leg by spawning replacement flight and relinking downstream dependency")
    void reassignLegDrone_failedLeg_spawnsRecoveryFlightAndRelinksNextLeg() {
        MissionExecution execution = MissionExecution.builder()
                .id("exec-rec-1")
                .missionId("m-multi-01")
                .pilotId("pilot-1")
                .totalLegs(2)
                .status(ExecutionStatus.PAUSED)
                .build();
        MissionExecutionLeg leg0 = MissionExecutionLeg.builder()
                .id("leg-0").executionId("exec-rec-1").legIndex(0).flightId("flt-0-failed")
                .departureHubId("hub-a").arrivalHubId("hub-b").droneId("drone-1")
                .stopoverType(StopoverType.RECHARGE).status(LegStatus.EMERGENCY_LANDING).build();
        MissionExecutionLeg leg1 = MissionExecutionLeg.builder()
                .id("leg-1").executionId("exec-rec-1").legIndex(1).flightId("flt-1")
                .departureHubId("hub-b").arrivalHubId("hub-c").droneId("drone-2")
                .status(LegStatus.PLANNED).build();
        DroneBriefVm replacementDrone = new DroneBriefVm("drone-99", "VN-REC-99", "available", "hub-a");

        when(missionExecutionRepository.findById("exec-rec-1")).thenReturn(Optional.of(execution));
        when(missionExecutionLegRepository.findByExecutionIdAndLegIndex("exec-rec-1", 0)).thenReturn(Optional.of(leg0));
        when(missionExecutionLegRepository.findByExecutionIdOrderByLegIndexAsc("exec-rec-1"))
                .thenReturn(List.of(leg0, leg1));
        when(droneClientService.getDroneById("drone-99")).thenReturn(Optional.of(replacementDrone));
        when(missionRepository.findById("m-multi-01")).thenReturn(Optional.of(multiLegMission));
        when(waypointRepository.findByMissionIdOrderBySequenceAsc("m-multi-01")).thenReturn(waypoints);
        when(flightClientService.createFlight(any(FlightCreateRequestVm.class)))
                .thenReturn(Optional.of(new FlightBriefVm("flt-0-recovery", "FLT-REC-0", "drone-99", "pilot-1", "scheduled", "pending")));
        when(missionExecutionMapper.toVm(any(MissionExecution.class), anyList())).thenReturn(mock(MissionExecutionVm.class));

        service.reassignLegDrone("exec-rec-1", 0,
                new com.utm.mission.viewmodel.execution.MissionExecutionReassignLegPostVm("drone-99", "Recovery after emergency landing"));

        assertThat(leg0.getFlightId()).isEqualTo("flt-0-recovery");
        assertThat(leg0.getDroneId()).isEqualTo("drone-99");
        assertThat(leg0.getStatus()).isEqualTo(LegStatus.PLANNED);
        verify(flightClientService).updateFlightLegPlan(eq("flt-1"), eq(java.util.Map.of("dependsOnFlightId", "flt-0-recovery")));
    }

    @Test
    @DisplayName("handleFlightLifecycleEvent ignores stale events for already terminal ABORTED execution")
    void handleFlightLifecycleEvent_terminalExecution_ignoredIdempotently() {
        MissionExecution abortedExec = MissionExecution.builder()
                .id("exec-aborted-1")
                .missionId("m-multi-01")
                .pilotId("pilot-1")
                .totalLegs(2)
                .status(ExecutionStatus.ABORTED)
                .build();
        when(missionExecutionLegRepository.findByFlightId("flt-stale")).thenReturn(Optional.empty());
        when(missionExecutionRepository.findById("exec-aborted-1")).thenReturn(Optional.of(abortedExec));

        FlightLifecycleEvent staleCancel = new FlightLifecycleEvent(
                FlightLifecycleEvent.FLIGHT_CANCELLED,
                "flt-stale", "FLT-STALE", "m-multi-01", "exec-aborted-1",
                0, 2, "drone-1", "hub-a", "hub-b", null,
                "cancelled", null, null, "Duplicate cancel", ZonedDateTime.now());

        service.handleFlightLifecycleEvent(staleCancel);

        verify(missionExecutionRepository, org.mockito.Mockito.never()).save(any());
        verify(missionRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    @DisplayName("getExecutionPlan previews in-memory charging hub insertion when autoSplitByRange is true while preserving unsplit plan when false")
    void getExecutionPlan_autoSplitByRange_insertsChargingHubStopoversInMemoryOnlyWhenEnabled() {
        HubBriefVm dep = new HubBriefVm("hub-start", "H-START", "Start Vertiport", 10.0000, 106.7000, null);
        HubBriefVm relay1 = new HubBriefVm("hub-1", "H-1", "Relay Hub 1", 10.2000, 106.7000, null);
        HubBriefVm relay2 = new HubBriefVm("hub-2", "H-2", "Relay Hub 2", 10.4000, 106.7000, null);
        HubBriefVm relay3 = new HubBriefVm("hub-3", "H-3", "Relay Hub 3", 10.6000, 106.7000, null);
        HubBriefVm arr = new HubBriefVm("hub-end", "H-END", "Destination Vertiport", 10.7700, 106.7000, null);

        Mission longHaulMission = Mission.builder()
                .id("m-long-preview")
                .name("Long-Haul Coastal Supply")
                .departureHubId(dep.id())
                .arrivalHubId(arr.id())
                .droneId("d-med")
                .payloadWeightKg(2.0)
                .status(MissionStatus.SCHEDULED)
                .build();

        DroneBriefVm refDrone = new DroneBriefVm(
                "d-med", "VN-MED-01", "DJI", "FlyCart", "available",
                dep.id(), dep.id(), 240.0, 100.0, 5.0,
                300.0, 240.0, 12.0, 100.0, 12.0, 30, 26000.0, 10.0, 10, List.of());

        List<Waypoint> rawWaypoints = List.of(
                Waypoint.builder().id("wp-long-1").sequence(1).name("Climb Point").waypointType(WaypointType.COORDINATE)
                        .latitude(10.0100).longitude(106.7000).altitude(80.0).stopoverType(StopoverType.NONE).build(),
                Waypoint.builder().id("wp-long-2").sequence(2).name("Approach Point").waypointType(WaypointType.COORDINATE)
                        .latitude(10.7600).longitude(106.7000).altitude(80.0).stopoverType(StopoverType.NONE).build());

        ScoredDroneCandidateVm eligibleCandidate = new ScoredDroneCandidateVm(
                "d-med", "VN-MED-01", "DJI", "FlyCart", 5.0, 240.0, 120.0, 30.0, true, null, 91.0);
        ScoredDroneCandidateVm ineligibleCandidate = new ScoredDroneCandidateVm(
                "d-med", "VN-MED-01", "DJI", "FlyCart", 5.0, 240.0, 950.0, -295.0, false, "Exceeds single-charge battery capacity", 0.0);

        when(missionRepository.findById("m-long-preview")).thenReturn(Optional.of(longHaulMission));
        when(waypointRepository.findByMissionIdOrderBySequenceAsc("m-long-preview")).thenReturn(rawWaypoints);
        when(hubClientService.getHubsByIds(any())).thenReturn(Map.of(dep.id(), dep, arr.id(), arr));
        when(hubClientService.getActiveHubs()).thenReturn(List.of(dep, relay1, relay2, relay3, arr));
        when(airspaceClientService.checkPathSafety(anyList())).thenReturn(List.of());
        when(droneClientService.getDroneById("d-med")).thenReturn(Optional.of(refDrone));
        when(fleetScoringService.scoreCandidateDronesForLeg(any())).thenAnswer(inv -> {
            com.utm.mission.util.MissionLegUtils.PlannedLegSpec spec = inv.getArgument(0);
            return spec.distanceMeters() > 35000.0 ? List.of(ineligibleCandidate) : List.of(eligibleCandidate);
        });

        MissionExecutionPlanVm unsplitPlan = service.getExecutionPlan("m-long-preview", false);
        assertThat(unsplitPlan.missionId()).isEqualTo("m-long-preview");
        assertThat(unsplitPlan.totalLegs()).isEqualTo(1);
        assertThat(unsplitPlan.feasible()).isFalse();
        assertThat(unsplitPlan.legs()).hasSize(1);
        assertThat(unsplitPlan.legs().getFirst().departureHubId()).isEqualTo("hub-start");
        assertThat(unsplitPlan.legs().getFirst().arrivalHubId()).isEqualTo("hub-end");

        MissionExecutionPlanVm splitPlan = service.getExecutionPlan("m-long-preview", true);
        assertThat(splitPlan.missionId()).isEqualTo("m-long-preview");
        assertThat(splitPlan.recommendedMode()).isEqualTo(ExecutionMode.SAME_DRONE_SEQUENTIAL);
        assertThat(splitPlan.totalLegs()).isEqualTo(4);
        assertThat(splitPlan.feasible()).isTrue();
        assertThat(splitPlan.legs()).hasSize(4);
        assertThat(splitPlan.legs().get(0).departureHubId()).isEqualTo("hub-start");
        assertThat(splitPlan.legs().get(0).arrivalHubId()).isEqualTo("hub-1");
        assertThat(splitPlan.legs().get(0).stopoverType()).isEqualTo(StopoverType.RECHARGE);
        assertThat(splitPlan.legs().get(1).departureHubId()).isEqualTo("hub-1");
        assertThat(splitPlan.legs().get(1).arrivalHubId()).isEqualTo("hub-2");
        assertThat(splitPlan.legs().get(1).stopoverType()).isEqualTo(StopoverType.RECHARGE);
        assertThat(splitPlan.legs().get(2).departureHubId()).isEqualTo("hub-2");
        assertThat(splitPlan.legs().get(2).arrivalHubId()).isEqualTo("hub-3");
        assertThat(splitPlan.legs().get(2).stopoverType()).isEqualTo(StopoverType.RECHARGE);
        assertThat(splitPlan.legs().get(3).departureHubId()).isEqualTo("hub-3");
        assertThat(splitPlan.legs().get(3).arrivalHubId()).isEqualTo("hub-end");
        assertThat(splitPlan.legs().get(3).stopoverType()).isEqualTo(StopoverType.NONE);

        verify(waypointRepository, org.mockito.Mockito.never()).save(any());
        verify(waypointRepository, org.mockito.Mockito.never()).saveAll(any());
    }
}
