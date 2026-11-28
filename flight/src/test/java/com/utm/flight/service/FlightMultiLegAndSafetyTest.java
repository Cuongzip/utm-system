package com.utm.flight.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.flight.kafka.FlightEventPublisher;
import com.utm.flight.mapper.FlightMapper;
import com.utm.flight.model.Flight;
import com.utm.flight.model.GeoJsonLineString;
import com.utm.flight.model.enumeration.FlightAuthorizationStatus;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.model.enumeration.Verdict;
import com.utm.flight.repository.FlightRepository;
import com.utm.flight.service.client.AirspaceClientService;
import com.utm.flight.service.client.DroneClientService;
import com.utm.flight.service.client.HubClientService;
import com.utm.flight.service.client.TelemetryClientService;
import com.utm.flight.viewmodel.client.TelemetryBriefVm;
import com.utm.flight.viewmodel.flight.FlightPostVm;
import com.utm.flight.viewmodel.flight.FlightVm;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: FlightServiceImpl Multi-Leg Gate, Schedule Overlap & ActualRoute")
class FlightMultiLegAndSafetyTest {

    @Mock
    private FlightRepository flightRepository;
    @Mock
    private FlightMapper flightMapper;
    @Mock
    private DroneClientService droneClientService;
    @Mock
    private HubClientService hubClientService;
    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();
    @Mock
    private AirspaceClientService airspaceClientService;
    @Mock
    private TelemetryClientService telemetryClientService;
    @Mock
    private FeasibilityService feasibilityService;
    @Mock
    private FlightEventPublisher flightEventPublisher;

    @InjectMocks
    private FlightServiceImpl flightService;

    @Test
    @DisplayName("createFlight rejects overlapping schedule for the same drone")
    void createFlight_overlappingDroneSchedule_throwsBadRequestException() {
        ZonedDateTime dep = ZonedDateTime.parse("2026-11-24T10:00:00Z");
        ZonedDateTime arr = dep.plusMinutes(30);
        FlightPostVm postVm = new FlightPostVm(
                "FLT-OVERLAP-1", "drone-1", "hub-a", "hub-b", "pilot-1",
                dep, arr, 60.0, null, null, null, null, Verdict.GO);

        when(flightRepository.existsByFlightNumber("FLT-OVERLAP-1")).thenReturn(false);
        when(droneClientService.checkDroneExists("drone-1")).thenReturn(true);
        when(flightRepository.findOverlappingFlights(eq("drone-1"), anyList(), eq(dep), eq(arr), eq(null)))
                .thenReturn(List.of(Flight.builder().id("existing-1").flightNumber("FLT-EXISTING").build()));

        assertThatThrownBy(() -> flightService.createFlight(postVm))
                .isInstanceOf(BadRequestException.class)
                .satisfies(ex -> assertThat(((BadRequestException) ex).getErrorCode())
                        .isEqualTo(MessageCode.DRONE_SCHEDULE_CONFLICT));
    }

    @Test
    @DisplayName("startFlight blocks Leg 1 when prerequisite Leg 0 flight is not yet COMPLETED")
    void startFlight_whenPrerequisiteLegIncomplete_throwsBadRequestException() {
        Flight leg0 = Flight.builder().id("flt-leg-0").status(FlightStatus.ACTIVE).build();
        Flight leg1 = Flight.builder()
                .id("flt-leg-1")
                .status(FlightStatus.AUTHORIZED)
                .authorizationStatus(FlightAuthorizationStatus.APPROVED)
                .dependsOnFlightId("flt-leg-0")
                .build();

        when(flightRepository.findById("flt-leg-1")).thenReturn(Optional.of(leg1));
        when(flightRepository.findById("flt-leg-0")).thenReturn(Optional.of(leg0));

        assertThatThrownBy(() -> flightService.startFlight("flt-leg-1"))
                .isInstanceOf(BadRequestException.class)
                .satisfies(ex -> assertThat(((BadRequestException) ex).getErrorCode())
                        .isEqualTo(MessageCode.PREVIOUS_LEG_NOT_COMPLETED));
    }

    @Test
    @DisplayName("completeFlight populates actualRoute GeoJSON from telemetry track and publishes FLIGHT_COMPLETED")
    void completeFlight_populatesActualRouteFromTelemetryAndPublishesEvent() {
        Flight activeFlight = Flight.builder()
                .id("flt-comp-1")
                .flightNumber("FLT-COMP-1")
                .droneId("drone-1")
                .departureHubId("hub-a")
                .arrivalHubId("hub-b")
                .status(FlightStatus.ACTIVE)
                .actualDeparture(ZonedDateTime.now().minusMinutes(10))
                .actualRoute(GeoJsonLineString.empty())
                .build();

        List<TelemetryBriefVm> track = List.of(
                new TelemetryBriefVm(10.7700, 106.7000, 50.0, 15.0, 45.0, 95.0, ZonedDateTime.now().minusMinutes(9)),
                new TelemetryBriefVm(10.7800, 106.7100, 60.0, 15.0, 45.0, 90.0, ZonedDateTime.now().minusMinutes(5)),
                new TelemetryBriefVm(10.7900, 106.7200, 50.0, 5.0, 45.0, 85.0, ZonedDateTime.now()));

        when(flightRepository.findById("flt-comp-1")).thenReturn(Optional.of(activeFlight));
        when(telemetryClientService.getFlightTrack("flt-comp-1")).thenReturn(track);
        when(flightRepository.saveAndFlush(activeFlight)).thenReturn(activeFlight);
        when(flightMapper.toVm(activeFlight)).thenReturn(mock(FlightVm.class));

        flightService.completeFlight("flt-comp-1");

        assertThat(activeFlight.getStatus()).isEqualTo(FlightStatus.COMPLETED);
        assertThat(activeFlight.getActualRoute().coordinates())
                .containsExactly(
                        List.of(106.7, 10.77, 50.0),
                        List.of(106.71, 10.78, 60.0),
                        List.of(106.72, 10.79, 50.0));
        verify(flightEventPublisher).publish(eq(FlightLifecycleEvent.FLIGHT_COMPLETED), eq(activeFlight),
                eq("hub-b"), eq(null), eq(null));
        assertThat(activeFlight.getEndingBatteryPct()).isEqualTo(85.0);
    }

    @Test
    @DisplayName("startFlight blocks takeoff when parent mission execution is PAUSED")
    void startFlight_whenExecutionPaused_throwsMissionExecutionPaused() {
        com.utm.flight.service.client.MissionClientService missionClient = mock(com.utm.flight.service.client.MissionClientService.class);
        FlightServiceImpl serviceWithMission = new FlightServiceImpl(
                flightRepository, flightMapper, droneClientService, hubClientService, objectMapper,
                airspaceClientService, telemetryClientService, null, feasibilityService,
                flightEventPublisher, missionClient, null, null);

        Flight leg1 = Flight.builder()
                .id("flt-paused-1")
                .executionId("exec-paused-1")
                .status(FlightStatus.AUTHORIZED)
                .authorizationStatus(FlightAuthorizationStatus.APPROVED)
                .build();

        when(flightRepository.findById("flt-paused-1")).thenReturn(Optional.of(leg1));
        when(missionClient.getExecutionStatus("exec-paused-1")).thenReturn(Optional.of("paused"));

        assertThatThrownBy(() -> serviceWithMission.startFlight("flt-paused-1"))
                .isInstanceOf(BadRequestException.class)
                .satisfies(ex -> assertThat(((BadRequestException) ex).getErrorCode())
                        .isEqualTo(MessageCode.MISSION_EXECUTION_PAUSED));
    }

    @Test
    @DisplayName("startFlight blocks consecutive leg takeoff when ground turnaround time has not elapsed and drone is charging")
    void startFlight_whenTurnaroundNotElapsed_throwsTurnaroundTimeNotElapsed() {
        Flight leg0 = Flight.builder()
                .id("flt-prev-1")
                .droneId("drone-1")
                .status(FlightStatus.COMPLETED)
                .actualArrival(ZonedDateTime.now().minusMinutes(5))
                .build();
        Flight leg1 = Flight.builder()
                .id("flt-next-1")
                .droneId("drone-1")
                .departureHubId("hub-b")
                .status(FlightStatus.AUTHORIZED)
                .authorizationStatus(FlightAuthorizationStatus.APPROVED)
                .dependsOnFlightId("flt-prev-1")
                .minimumTurnaroundMinutes(30)
                .build();

        com.utm.flight.viewmodel.client.DroneBriefVm chargingDrone = new com.utm.flight.viewmodel.client.DroneBriefVm(
                "drone-1", "VN-01", "charging", 500.0, 5.0, 250.0, 200.0, 12.0, 100.0, 12.0, 40.0,
                "hub-a", "hub-b", 35.0, 20000.0);

        when(flightRepository.findById("flt-next-1")).thenReturn(Optional.of(leg1));
        when(flightRepository.findById("flt-prev-1")).thenReturn(Optional.of(leg0));
        when(droneClientService.getDroneById("drone-1")).thenReturn(Optional.of(chargingDrone));

        assertThatThrownBy(() -> flightService.startFlight("flt-next-1"))
                .isInstanceOf(BadRequestException.class)
                .satisfies(ex -> assertThat(((BadRequestException) ex).getErrorCode())
                        .isEqualTo(MessageCode.TURNAROUND_TIME_NOT_ELAPSED));
    }

    @Test
    @DisplayName("startFlight blocks takeoff when live drone battery is insufficient for route")
    void startFlight_whenLiveBatteryInsufficient_throwsInsufficientBattery() {
        Flight flight = Flight.builder()
                .id("flt-lowbat-1")
                .droneId("drone-1")
                .departureHubId("hub-a")
                .status(FlightStatus.AUTHORIZED)
                .authorizationStatus(FlightAuthorizationStatus.APPROVED)
                .payloadWeightKg(2.0)
                .plannedRoute(GeoJsonLineString.of(List.of(
                        List.of(106.7000, 10.7000, 50.0),
                        List.of(106.7000, 10.9000, 50.0))))
                .build();

        com.utm.flight.viewmodel.client.DroneBriefVm lowBatDrone = new com.utm.flight.viewmodel.client.DroneBriefVm(
                "drone-1", "VN-01", "available", 500.0, 5.0, 250.0, 200.0, 12.0, 100.0, 12.0, 40.0,
                "hub-a", "hub-a", 15.0, 20000.0);

        when(flightRepository.findById("flt-lowbat-1")).thenReturn(Optional.of(flight));
        when(droneClientService.getDroneById("drone-1")).thenReturn(Optional.of(lowBatDrone));

        assertThatThrownBy(() -> flightService.startFlight("flt-lowbat-1"))
                .isInstanceOf(BadRequestException.class)
                .satisfies(ex -> assertThat(((BadRequestException) ex).getErrorCode())
                        .isEqualTo(MessageCode.INSUFFICIENT_BATTERY_FOR_FLIGHT));
    }

    @Test
    @DisplayName("authorizeFlight rejects flight when strategic 4D trajectory check reports conflict")
    void authorizeFlight_when4DConflictDetected_throwsTrajectoryConflictDetected() {
        com.utm.flight.service.client.ConflictClientService conflictClient = mock(com.utm.flight.service.client.ConflictClientService.class);
        FlightServiceImpl serviceWithConflict = new FlightServiceImpl(
                flightRepository, flightMapper, droneClientService, hubClientService, objectMapper,
                airspaceClientService, telemetryClientService, null, feasibilityService,
                flightEventPublisher, null, conflictClient, null);

        Flight flight = Flight.builder()
                .id("flt-conf-1")
                .departureHubId("hub-a")
                .arrivalHubId("hub-b")
                .status(FlightStatus.SCHEDULED)
                .authorizationStatus(FlightAuthorizationStatus.PENDING)
                .feasibilityVerdict(Verdict.GO)
                .plannedRoute(GeoJsonLineString.of(List.of(
                        List.of(106.7000, 10.7700, 50.0),
                        List.of(106.7200, 10.7900, 50.0))))
                .build();

        when(flightRepository.findById("flt-conf-1")).thenReturn(Optional.of(flight));
        when(conflictClient.checkTrajectory4D(flight)).thenReturn(Optional.of(
                new com.utm.flight.viewmodel.client.TrajectoryConflictCheckResultClientVm(
                        false, 2, List.of(), "Adjust departure +5 min")));

        assertThatThrownBy(() -> serviceWithConflict.authorizeFlight("flt-conf-1"))
                .isInstanceOf(BadRequestException.class)
                .satisfies(ex -> assertThat(((BadRequestException) ex).getErrorCode())
                        .isEqualTo(MessageCode.TRAJECTORY_CONFLICT_DETECTED));
    }

    @Test
    @DisplayName("returnToHome updates plannedRoute to 3D RTH corridor and completeFlight with departureHubId publishes actualLandingHubId")
    void returnToHomeAndCompleteAtDepartureHub_updatesCorridorAndLandingHub() {
        Flight activeFlight = Flight.builder()
                .id("flt-rth-1")
                .flightNumber("FLT-RTH-1")
                .droneId("drone-rth-1")
                .departureHubId("hub-dep-alpha")
                .arrivalHubId("hub-arr-bravo")
                .cruisingAltitudeM(65.0)
                .status(FlightStatus.ACTIVE)
                .plannedRoute(GeoJsonLineString.of(List.of(
                        List.of(106.7000, 10.7700, 65.0),
                        List.of(106.7150, 10.7900, 65.0),
                        List.of(106.7300, 10.7700, 65.0))))
                .build();

        when(flightRepository.findById("flt-rth-1")).thenReturn(Optional.of(activeFlight));
        when(telemetryClientService.getLatestFlightTelemetry("flt-rth-1")).thenReturn(Optional.of(
                new TelemetryBriefVm(10.7900, 106.7150, 65.0, 15.0, 90.0, 82.0, ZonedDateTime.now())));
        when(hubClientService.getHubById("hub-dep-alpha")).thenReturn(Optional.of(
                new com.utm.flight.viewmodel.client.HubBriefVm("hub-dep-alpha", "H-ALPHA", "Alpha Hub",
                        new com.utm.flight.viewmodel.flight.LocationVm(10.7700, 106.7000), 10.0)));
        when(flightRepository.saveAndFlush(activeFlight)).thenReturn(activeFlight);
        when(flightMapper.toVm(activeFlight)).thenReturn(mock(FlightVm.class));

        flightService.returnToHome("flt-rth-1", "Operator C2 RTH command");

        assertThat(activeFlight.getStatus()).isEqualTo(FlightStatus.DIVERTED);
        assertThat(activeFlight.getPlannedRoute().coordinates()).containsExactly(
                List.of(106.7150, 10.7900, 65.0),
                List.of(106.7000, 10.7700, 65.0),
                List.of(106.7000, 10.7700, 0.0));

        flightService.completeFlight("flt-rth-1", "hub-dep-alpha");

        assertThat(activeFlight.getStatus()).isEqualTo(FlightStatus.COMPLETED);
        verify(flightEventPublisher).publish(eq(FlightLifecycleEvent.FLIGHT_COMPLETED), eq(activeFlight),
                eq("hub-dep-alpha"), eq(null), eq(null));
    }

    @Test
    @DisplayName("updateActiveCruisingAltitude clamps altitude, updates airborne Z coordinates while preserving 0m pad anchors, and resolves conformance conflicts")
    void updateActiveCruisingAltitude_activeFlight_clampsUpdatesAirborneRouteAndResolvesConflicts() {
        com.utm.flight.service.client.ConflictClientService conflictClient = mock(com.utm.flight.service.client.ConflictClientService.class);
        FlightServiceImpl serviceWithConflict = new FlightServiceImpl(
                flightRepository, flightMapper, droneClientService, hubClientService, objectMapper,
                airspaceClientService, telemetryClientService, null, feasibilityService,
                flightEventPublisher, null, conflictClient, null);

        Flight activeFlight = Flight.builder()
                .id("flt-alt-c2")
                .flightNumber("FLT-ALT-C2")
                .droneId("drone-alt-1")
                .departureHubId("hub-dep-alpha")
                .arrivalHubId("hub-arr-bravo")
                .cruisingAltitudeM(60.0)
                .status(FlightStatus.ACTIVE)
                .conformanceStatus(com.utm.flight.model.enumeration.ConformanceStatus.NON_CONFORMING)
                .plannedRoute(GeoJsonLineString.of(List.of(
                        List.of(106.7000, 10.7700, 0.0),
                        List.of(106.7000, 10.7700, 60.0),
                        List.of(106.7150, 10.7850, 60.0),
                        List.of(106.7300, 10.8000, 60.0),
                        List.of(106.7300, 10.8000, 0.0))))
                .build();

        when(flightRepository.findById("flt-alt-c2")).thenReturn(Optional.of(activeFlight));
        when(flightRepository.saveAndFlush(activeFlight)).thenReturn(activeFlight);
        when(flightMapper.toVm(activeFlight)).thenReturn(mock(FlightVm.class));

        serviceWithConflict.updateActiveCruisingAltitude("flt-alt-c2", 115.0);

        assertThat(activeFlight.getCruisingAltitudeM()).isEqualTo(115.0);
        assertThat(activeFlight.getConformanceStatus())
                .isEqualTo(com.utm.flight.model.enumeration.ConformanceStatus.CONFORMANT);
        assertThat(activeFlight.getPlannedRoute().coordinates()).containsExactly(
                List.of(106.7000, 10.7700, 0.0),
                List.of(106.7000, 10.7700, 115.0),
                List.of(106.7150, 10.7850, 115.0),
                List.of(106.7300, 10.8000, 115.0),
                List.of(106.7300, 10.8000, 0.0));
        verify(conflictClient).resolveConformanceConflicts(
                eq("flt-alt-c2"), eq("Cruising altitude updated via C2 SET_ALTITUDE"));

        serviceWithConflict.updateActiveCruisingAltitude("flt-alt-c2", 650.0);
        assertThat(activeFlight.getCruisingAltitudeM()).isEqualTo(500.0);
    }

    @Test
    @DisplayName("tacticalGoto, resumePlannedRoute, and C2 SET_ALTITUDE keep ATC plannedRoute and cruisingAltitudeM immutable")
    void tacticalGotoResumeAndSetAltitudeCommand_keepPlannedRouteAndCruisingAltitudeImmutable() {
        com.utm.flight.service.client.ConflictClientService conflictClient = mock(com.utm.flight.service.client.ConflictClientService.class);
        FlightServiceImpl serviceWithConflict = new FlightServiceImpl(
                flightRepository, flightMapper, droneClientService, hubClientService, objectMapper,
                airspaceClientService, telemetryClientService, null, feasibilityService,
                flightEventPublisher, null, conflictClient, null);

        List<com.utm.flight.model.FlightWaypoint> originalWaypoints = List.of(
                new com.utm.flight.model.FlightWaypoint(1, "Corridor Entry", 10.7800, 106.7100, 65.0, null, null),
                new com.utm.flight.model.FlightWaypoint(2, "Corridor Exit", 10.7900, 106.7200, 65.0, null, null));

        List<List<Double>> approvedCoords = List.of(
                List.of(106.7000, 10.7700, 0.0),
                List.of(106.7000, 10.7700, 65.0),
                List.of(106.7100, 10.7800, 65.0),
                List.of(106.7200, 10.7900, 65.0),
                List.of(106.7300, 10.8000, 65.0),
                List.of(106.7300, 10.8000, 0.0));

        Flight activeFlight = Flight.builder()
                .id("flt-goto-c2")
                .flightNumber("FLT-GOTO-C2")
                .droneId("drone-goto-1")
                .departureHubId("hub-dep-alpha")
                .arrivalHubId("hub-arr-bravo")
                .cruisingAltitudeM(65.0)
                .status(FlightStatus.ACTIVE)
                .conformanceStatus(com.utm.flight.model.enumeration.ConformanceStatus.CONFORMANT)
                .waypoints(originalWaypoints)
                .plannedRoute(GeoJsonLineString.of(approvedCoords))
                .build();

        when(flightRepository.findById("flt-goto-c2")).thenReturn(Optional.of(activeFlight));
        when(flightRepository.saveAndFlush(activeFlight)).thenReturn(activeFlight);
        when(flightMapper.toVm(activeFlight)).thenReturn(mock(FlightVm.class));

        com.utm.flight.kafka.DroneCommandConsumer consumer = new com.utm.flight.kafka.DroneCommandConsumer(
                flightRepository, serviceWithConflict, objectMapper);
        consumer.onCommandReceived("flt-goto-c2", new com.utm.commonlibrary.kafka.event.DroneCommandEvent(
                "cmd-alt-220", "drone-goto-1", "flt-goto-c2", "SET_ALTITUDE", 1,
                "{\"targetAltitude\": 220.0}", "PENDING", ZonedDateTime.now()));

        assertThat(activeFlight.getCruisingAltitudeM()).isEqualTo(65.0);
        assertThat(activeFlight.getPlannedRoute().coordinates()).containsExactlyElementsOf(approvedCoords);

        serviceWithConflict.tacticalGoto("flt-goto-c2", 10.7820, 106.7180, 110.0);

        assertThat(activeFlight.getStatus()).isEqualTo(FlightStatus.DIVERTED);
        assertThat(activeFlight.getCruisingAltitudeM()).isEqualTo(65.0);
        assertThat(activeFlight.getArrivalHubId()).isEqualTo("hub-arr-bravo");
        assertThat(activeFlight.getWaypoints()).hasSize(2);
        assertThat(activeFlight.getPlannedRoute().coordinates()).containsExactlyElementsOf(approvedCoords);

        when(hubClientService.getHubById("hub-arr-bravo")).thenReturn(Optional.of(
                new com.utm.flight.viewmodel.client.HubBriefVm("hub-arr-bravo", "H-BRAVO", "Bravo Hub",
                        new com.utm.flight.viewmodel.flight.LocationVm(10.8000, 106.7300), 10.0)));

        serviceWithConflict.resumePlannedRoute("flt-goto-c2");

        assertThat(activeFlight.getStatus()).isEqualTo(FlightStatus.ACTIVE);
        assertThat(activeFlight.getCruisingAltitudeM()).isEqualTo(65.0);
        assertThat(activeFlight.getPlannedRoute().coordinates()).containsExactlyElementsOf(approvedCoords);
        verify(conflictClient).resolveConformanceConflicts(
                eq("flt-goto-c2"), eq("Flight resumed planned corridor"));
    }

    @Test
    @DisplayName("divertFlight with live telemetry builds 3D active diversion corridor from aircraft position to alternate hub touchdown")
    void divertFlight_withLiveTelemetry_buildsActive3dCorridorToAlternateHub() {
        com.utm.flight.service.client.ConflictClientService conflictClient = mock(com.utm.flight.service.client.ConflictClientService.class);
        FlightServiceImpl serviceWithConflict = new FlightServiceImpl(
                flightRepository, flightMapper, droneClientService, hubClientService, objectMapper,
                airspaceClientService, telemetryClientService, null, feasibilityService,
                flightEventPublisher, null, conflictClient, null);

        Flight activeFlight = Flight.builder()
                .id("flt-divert-1")
                .flightNumber("FLT-DIV-1")
                .droneId("drone-div-1")
                .departureHubId("hub-dep-alpha")
                .arrivalHubId("hub-arr-bravo")
                .cruisingAltitudeM(60.0)
                .status(FlightStatus.ACTIVE)
                .plannedRoute(GeoJsonLineString.of(List.of(
                        List.of(106.7000, 10.7700, 60.0),
                        List.of(106.7300, 10.8000, 60.0))))
                .build();

        when(flightRepository.findById("flt-divert-1")).thenReturn(Optional.of(activeFlight));
        when(telemetryClientService.getLatestFlightTelemetry("flt-divert-1")).thenReturn(Optional.of(
                new TelemetryBriefVm(10.7850, 106.7120, 75.0, 15.0, 45.0, 80.0, ZonedDateTime.now())));
        when(hubClientService.getHubById("hub-divert-charlie")).thenReturn(Optional.of(
                new com.utm.flight.viewmodel.client.HubBriefVm("hub-divert-charlie", "H-CHARLIE", "Charlie Hub",
                        new com.utm.flight.viewmodel.flight.LocationVm(10.7600, 106.6900), 10.0)));
        when(flightRepository.saveAndFlush(activeFlight)).thenReturn(activeFlight);
        when(flightMapper.toVm(activeFlight)).thenReturn(mock(FlightVm.class));

        serviceWithConflict.divertFlight("flt-divert-1", "hub-divert-charlie", "Operator GOTO hub diversion command");

        assertThat(activeFlight.getStatus()).isEqualTo(FlightStatus.DIVERTED);
        assertThat(activeFlight.getArrivalHubId()).isEqualTo("hub-divert-charlie");
        assertThat(activeFlight.getConformanceStatus())
                .isEqualTo(com.utm.flight.model.enumeration.ConformanceStatus.CONFORMANT);
        assertThat(activeFlight.getPlannedRoute().coordinates()).containsExactly(
                List.of(106.7120, 10.7850, 75.0),
                List.of(106.6900, 10.7600, 75.0),
                List.of(106.6900, 10.7600, 0.0));
        verify(flightEventPublisher).publish(
                eq(FlightLifecycleEvent.FLIGHT_DIVERTED), eq(activeFlight), eq("hub-divert-charlie"),
                eq(null), eq("Operator GOTO hub diversion command"));
        verify(conflictClient).resolveConformanceConflicts(
                eq("flt-divert-1"), eq("Flight diverted along updated corridor"));
    }

    @Test
    @DisplayName("createFlight with client-provided unanchored plannedRoute anchors 3D VTOL vertical shafts at departure and arrival hubs")
    void createFlight_withClientUnanchoredPlannedRoute_anchorsVerticalHubShafts() {
        ZonedDateTime dep = ZonedDateTime.parse("2026-11-28T09:00:00Z");
        ZonedDateTime arr = dep.plusMinutes(25);
        com.utm.flight.viewmodel.flight.GeoJsonLineStringVm clientRoute =
                com.utm.flight.viewmodel.flight.GeoJsonLineStringVm.of(List.of(
                        List.of(106.7000, 10.7700, 12.0),
                        List.of(106.7150, 10.7850, 120.0),
                        List.of(106.7300, 10.8000, 15.0)));
        FlightPostVm postVm = new FlightPostVm(
                "FLT-VTOL-SHAFT-1", "drone-vtol-1", "hub-dep-vtol", "hub-arr-vtol", "pilot-1",
                dep, arr, 120.0, "Medical corridor flight", null, clientRoute, null, Verdict.GO);
        Flight entity = Flight.builder()
                .id("flt-vtol-1")
                .droneId("drone-vtol-1")
                .departureHubId("hub-dep-vtol")
                .arrivalHubId("hub-arr-vtol")
                .cruisingAltitudeM(120.0)
                .build();

        when(flightRepository.existsByFlightNumber("FLT-VTOL-SHAFT-1")).thenReturn(false);
        when(droneClientService.checkDroneExists("drone-vtol-1")).thenReturn(true);
        when(flightRepository.findOverlappingFlights(eq("drone-vtol-1"), anyList(), eq(dep), eq(arr), eq(null)))
                .thenReturn(List.of());
        when(hubClientService.getHubById("hub-dep-vtol")).thenReturn(Optional.of(
                new com.utm.flight.viewmodel.client.HubBriefVm("hub-dep-vtol", "H-DEP", "Central Departure Vertiport",
                        new com.utm.flight.viewmodel.flight.LocationVm(10.7700, 106.7000), 12.0)));
        when(hubClientService.getHubById("hub-arr-vtol")).thenReturn(Optional.of(
                new com.utm.flight.viewmodel.client.HubBriefVm("hub-arr-vtol", "H-ARR", "East Arrival Vertiport",
                        new com.utm.flight.viewmodel.flight.LocationVm(10.8000, 106.7300), 15.0)));
        when(flightMapper.toEntity(postVm)).thenReturn(entity);
        when(flightRepository.saveAndFlush(entity)).thenReturn(entity);
        when(flightMapper.toVm(entity)).thenReturn(mock(FlightVm.class));

        flightService.createFlight(postVm);

        assertThat(entity.getPlannedRoute().coordinates()).containsExactly(
                List.of(106.7000, 10.7700, 0.0),
                List.of(106.7000, 10.7700, 120.0),
                List.of(106.7150, 10.7850, 120.0),
                List.of(106.7300, 10.8000, 120.0),
                List.of(106.7300, 10.8000, 0.0));
    }

    @Test
    @DisplayName("evaluateFlightConformance selects vertical takeoff and landing shafts in 3D with zero vertical error despite horizontal GPS jitter")
    void evaluateFlightConformance_duringVerticalClimbAndLandingWithGpsJitter_remainsConformantWithZeroVerticalError() {
        com.utm.flight.repository.FlightConformanceRepository conformanceRepo =
                mock(com.utm.flight.repository.FlightConformanceRepository.class);
        com.utm.flight.service.client.ConflictClientService conflictClient =
                mock(com.utm.flight.service.client.ConflictClientService.class);
        com.utm.flight.service.client.EmergencyClientService emergencyClient =
                mock(com.utm.flight.service.client.EmergencyClientService.class);
        com.utm.flight.mapper.FlightConformanceMapper conformanceMapper =
                org.mapstruct.factory.Mappers.getMapper(com.utm.flight.mapper.FlightConformanceMapper.class);

        FlightConformanceServiceImpl conformanceService = new FlightConformanceServiceImpl(
                flightRepository, conformanceRepo, telemetryClientService, conflictClient,
                emergencyClient, conformanceMapper, objectMapper, null, flightEventPublisher);

        Flight vtolFlight = Flight.builder()
                .id("flt-vtol-conf-1")
                .flightNumber("FLT-VTOL-CONF-1")
                .droneId("drone-vtol-1")
                .status(FlightStatus.ACTIVE)
                .conformanceStatus(com.utm.flight.model.enumeration.ConformanceStatus.CONFORMANT)
                .cruisingAltitudeM(120.0)
                .plannedRoute(GeoJsonLineString.of(List.of(
                        List.of(106.7000, 10.7700, 0.0),
                        List.of(106.7000, 10.7700, 120.0),
                        List.of(106.7100, 10.7700, 120.0),
                        List.of(106.7100, 10.7700, 0.0))))
                .build();
        com.utm.flight.model.FlightConformance conformance = com.utm.flight.model.FlightConformance.builder()
                .id("conf-vtol-1")
                .flight(vtolFlight)
                .status(com.utm.flight.model.enumeration.ConformanceStatus.CONFORMANT)
                .corridorRadiusM(15.0)
                .altitudeBufferM(10.0)
                .build();

        double lonOffset1p5m = 1.5 / (6_371_000.0 * Math.cos(Math.toRadians(10.7700))) * (180.0 / Math.PI);
        TelemetryBriefVm climbingTelemetry = new TelemetryBriefVm(
                10.7700, 106.7000 + lonOffset1p5m, 35.0, 0.2, 90.0, 98.0,
                ZonedDateTime.now(), "AUTONOMOUS", 4.0);

        when(flightRepository.findById("flt-vtol-conf-1")).thenReturn(Optional.of(vtolFlight));
        when(conformanceRepo.findByFlightId("flt-vtol-conf-1")).thenReturn(Optional.of(conformance));
        when(telemetryClientService.getLatestFlightTelemetry("flt-vtol-conf-1")).thenReturn(Optional.of(climbingTelemetry));
        when(conformanceRepo.save(conformance)).thenReturn(conformance);

        conformanceService.evaluateFlightConformance("flt-vtol-conf-1");

        assertThat(conformance.getStatus()).isEqualTo(com.utm.flight.model.enumeration.ConformanceStatus.CONFORMANT);
        assertThat(conformance.getVerticalErrorM()).isEqualTo(0.0);
        assertThat(conformance.getCrossTrackErrorM()).isLessThanOrEqualTo(2.0);
        assertThat(conformance.getViolations()).isNull();

        conformance.setCurrentAltitude(95.0);
        conformance.setLastTelemetryTime(ZonedDateTime.now().minusSeconds(1));
        TelemetryBriefVm landingTelemetry = new TelemetryBriefVm(
                10.7700, 106.7100 - lonOffset1p5m, 25.0, 0.2, 90.0, 86.0,
                ZonedDateTime.now(), "AUTONOMOUS", -3.5);
        when(telemetryClientService.getLatestFlightTelemetry("flt-vtol-conf-1")).thenReturn(Optional.of(landingTelemetry));

        conformanceService.evaluateFlightConformance("flt-vtol-conf-1");

        assertThat(conformance.getStatus()).isEqualTo(com.utm.flight.model.enumeration.ConformanceStatus.CONFORMANT);
        assertThat(conformance.getVerticalErrorM()).isEqualTo(0.0);
        assertThat(conformance.getCrossTrackErrorM()).isLessThanOrEqualTo(2.0);
        assertThat(conformance.getViolations()).isNull();
        verify(conflictClient, org.mockito.Mockito.never())
                .reportConformanceConflict(any(), any(), any(), any(), any(), any());
        verify(emergencyClient, org.mockito.Mockito.never())
                .reportIncident(any(), any(), any(), any(), any(), any());
    }
}
