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
}
