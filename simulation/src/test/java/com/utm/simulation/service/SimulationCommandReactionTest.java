package com.utm.simulation.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.kafka.event.DroneCommandEvent;
import com.utm.simulation.mapper.SimulationMapper;
import com.utm.simulation.model.SimulationEvent;
import com.utm.simulation.model.SimulationSession;
import com.utm.simulation.model.enumeration.SimulationStatus;
import com.utm.simulation.repository.SimulationEventRepository;
import com.utm.simulation.repository.SimulationSessionRepository;
import com.utm.simulation.service.client.FlightClientService;
import com.utm.simulation.service.client.TelemetryClientService;
import com.utm.simulation.viewmodel.client.FlightDetailVm;
import com.utm.simulation.viewmodel.client.GeoJsonLineStringVm;
import com.utm.simulation.viewmodel.session.SimulationSessionCreateVm;
import com.utm.simulation.viewmodel.session.SimulationSessionVm;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: SimulationServiceImpl C2 Command Reaction & Flight Sync")
class SimulationCommandReactionTest {

    @Mock
    private SimulationSessionRepository sessionRepository;

    @Mock
    private SimulationEventRepository eventRepository;

    @Mock
    private SimulationMapper simulationMapper;

    @Mock
    private TelemetryClientService telemetryClientService;

    @Mock
    private FlightClientService flightClientService;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private SimulationServiceImpl simulationService;

    @AfterEach
    void tearDown() {
        simulationService.cleanup();
    }

    @Test
    @DisplayName("createSession starts authorized flight and handleDroneCommand reacts to HOVER, SET_ALTITUDE, GOTO, LAND")
    void handleDroneCommand_updatesRunningSessionAndRecordsCommandEvents() {
        String sessionId = "sim-c2-1";
        String flightId = "flt-c2-1";
        String droneId = "drn-c2-1";

        GeoJsonLineStringVm route = new GeoJsonLineStringVm("LineString", List.of(
                List.of(106.7000, 10.7700, 60.0),
                List.of(106.7200, 10.7900, 60.0)));
        FlightDetailVm authorizedFlight = new FlightDetailVm(
                flightId, "FLT-C2-01", droneId, "hub-1", "hub-2", 60.0, route, 2,
                Collections.emptyList(), "authorized");
        SimulationSession entity = SimulationSession.builder()
                .id(sessionId)
                .flightId(flightId)
                .droneId(droneId)
                .status(SimulationStatus.RUNNING)
                .speed(15.0)
                .timeScale(1.0)
                .currentBattery(95.0)
                .build();
        SimulationSessionVm vm = new SimulationSessionVm(
                sessionId, flightId, droneId, SimulationStatus.RUNNING, 15.0, 1.0,
                10.77, 106.70, 60.0, 45.0, 95.0, 0.0, 3000.0, 0.0, 0, null,
                ZonedDateTime.now(), ZonedDateTime.now());
        SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(flightId, 15.0, 1.0, 95.0);

        when(flightClientService.getFlightDetail(flightId)).thenReturn(authorizedFlight);
        when(flightClientService.startFlight(flightId)).thenReturn(true);
        when(sessionRepository.existsByDroneIdAndStatusIn(eq(droneId), anyList())).thenReturn(false);
        when(sessionRepository.existsByFlightIdAndStatusIn(eq(flightId), anyList())).thenReturn(false);
        when(simulationMapper.toEntity(createVm)).thenReturn(entity);
        when(sessionRepository.saveAndFlush(entity)).thenReturn(entity);
        when(simulationMapper.toVm(entity)).thenReturn(vm);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(entity));
        when(simulationMapper.toEventEntity(eq(sessionId), eq("COMMAND_EXECUTED"), anyString(), anyString(),
                anyString(), any())).thenReturn(SimulationEvent.builder().id("evt-1").sessionId(sessionId).build());
        when(eventRepository.save(any(SimulationEvent.class)))
                .thenReturn(SimulationEvent.builder().id("evt-1").sessionId(sessionId).build());

        simulationService.createSession(createVm);
        verify(flightClientService).startFlight(flightId);

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-1", droneId, flightId, "HOVER", 1, "{}", "PENDING", ZonedDateTime.now()));
        assertThat(entity.getSpeed()).isEqualTo(0.0);

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-2", droneId, flightId, "SET_ALTITUDE", 1, "{\"targetAltitude\": 90.0}", "PENDING", ZonedDateTime.now()));
        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-3", droneId, flightId, "GOTO", 1, "{\"latitude\": 10.78, \"longitude\": 106.71, \"altitude\": 70.0}", "PENDING", ZonedDateTime.now()));
        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-4", droneId, flightId, "LAND", 0, "{}", "PENDING", ZonedDateTime.now()));

        verify(eventRepository, atLeastOnce()).save(any(SimulationEvent.class));
        assertThat(entity.getSpeed()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("handleDroneCommand RTL overrides c2_lost loiter freeze so drone returns to departure hub")
    void handleDroneCommand_rtlDuringC2Lost_restoresCruiseSpeedForFailsafeReturn() {
        String sessionId = "sim-c2-rtl";
        String flightId = "flt-c2-rtl";
        String droneId = "drn-c2-rtl";

        GeoJsonLineStringVm route = new GeoJsonLineStringVm("LineString", List.of(
                List.of(106.7000, 10.7700, 60.0),
                List.of(106.7200, 10.7900, 60.0)));
        FlightDetailVm activeFlight = new FlightDetailVm(
                flightId, "FLT-C2-02", droneId, "hub-1", "hub-2", 60.0, route, 2,
                Collections.emptyList(), "active");
        SimulationSession entity = SimulationSession.builder()
                .id(sessionId)
                .flightId(flightId)
                .droneId(droneId)
                .status(SimulationStatus.RUNNING)
                .speed(15.0)
                .timeScale(1.0)
                .currentBattery(90.0)
                .build();
        SimulationSessionVm vm = new SimulationSessionVm(
                sessionId, flightId, droneId, SimulationStatus.RUNNING, 15.0, 1.0,
                10.77, 106.70, 60.0, 45.0, 90.0, 0.0, 3000.0, 0.0, 0, null,
                ZonedDateTime.now(), ZonedDateTime.now());
        SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(flightId, 15.0, 1.0, 90.0);

        when(flightClientService.getFlightDetail(flightId)).thenReturn(activeFlight);
        when(sessionRepository.existsByDroneIdAndStatusIn(eq(droneId), anyList())).thenReturn(false);
        when(sessionRepository.existsByFlightIdAndStatusIn(eq(flightId), anyList())).thenReturn(false);
        when(simulationMapper.toEntity(createVm)).thenReturn(entity);
        when(sessionRepository.saveAndFlush(entity)).thenReturn(entity);
        when(simulationMapper.toVm(entity)).thenReturn(vm);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(entity));
        when(sessionRepository.save(entity)).thenReturn(entity);
        when(simulationMapper.toEventEntity(eq(sessionId), anyString(), any(), anyString(), anyString(), any()))
                .thenReturn(SimulationEvent.builder().id("evt-rtl").sessionId(sessionId).build());
        when(eventRepository.save(any(SimulationEvent.class)))
                .thenReturn(SimulationEvent.builder().id("evt-rtl").sessionId(sessionId).build());

        simulationService.createSession(createVm);
        simulationService.injectScenario(sessionId, new com.utm.simulation.viewmodel.scenario.InjectScenarioVm(
                com.utm.simulation.model.enumeration.EmergencyScenarioType.C2_LOST, null));
        assertThat(entity.getActiveScenario()).isEqualTo("c2_lost");

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-rtl-1", droneId, flightId, "RTL", 0, "{}", "PENDING", ZonedDateTime.now()));

        assertThat(entity.getSpeed()).isEqualTo(15.0);
    }

    @Test
    @DisplayName("handleDroneCommand RTL wakes PAUSED session, executes 3D cruise + 0m descent, publishes COMPLETED ACK, and completes flight at departureHubId")
    void handleDroneCommand_rtlWakesPausedSessionDescendsToZeroAndCompletesAtDepartureHub() {
        String sessionId = "sim-rtl-3d";
        String flightId = "flt-rtl-3d";
        String droneId = "drn-rtl-3d";
        var ackPublisher = org.mockito.Mockito.mock(com.utm.simulation.kafka.SimulationCommandAckPublisher.class);
        simulationService.setCommandAckPublisher(ackPublisher);

        GeoJsonLineStringVm route = new GeoJsonLineStringVm("LineString", List.of(
                List.of(106.7000, 10.7700, 60.0),
                List.of(106.7010, 10.7700, 60.0)));
        FlightDetailVm activeFlight = new FlightDetailVm(
                flightId, "FLT-RTL-3D", droneId, "hub-dep-alpha", "hub-arr-bravo", 60.0, route, 2,
                Collections.emptyList(), "active");
        SimulationSession entity = SimulationSession.builder()
                .id(sessionId)
                .flightId(flightId)
                .droneId(droneId)
                .status(SimulationStatus.RUNNING)
                .speed(20.0)
                .timeScale(5.0)
                .currentBattery(92.0)
                .build();
        SimulationSessionVm vm = new SimulationSessionVm(
                sessionId, flightId, droneId, SimulationStatus.RUNNING, 20.0, 5.0,
                10.7700, 106.7000, 60.0, 90.0, 92.0, 0.0, 120.0, 0.0, 0, null,
                ZonedDateTime.now(), ZonedDateTime.now());
        SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(flightId, 20.0, 5.0, 92.0);

        when(flightClientService.getFlightDetail(flightId)).thenReturn(activeFlight);
        when(sessionRepository.existsByDroneIdAndStatusIn(eq(droneId), anyList())).thenReturn(false);
        when(sessionRepository.existsByFlightIdAndStatusIn(eq(flightId), anyList())).thenReturn(false);
        when(simulationMapper.toEntity(createVm)).thenReturn(entity);
        when(sessionRepository.saveAndFlush(entity)).thenReturn(entity);
        when(simulationMapper.toVm(entity)).thenReturn(vm);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(entity));
        when(sessionRepository.save(entity)).thenReturn(entity);
        when(simulationMapper.toEventEntity(eq(sessionId), anyString(), any(), anyString(), anyString(), any()))
                .thenReturn(SimulationEvent.builder().id("evt-rtl-3d").sessionId(sessionId).build());
        when(eventRepository.save(any(SimulationEvent.class)))
                .thenReturn(SimulationEvent.builder().id("evt-rtl-3d").sessionId(sessionId).build());

        simulationService.createSession(createVm);
        simulationService.stepSessionOnce(sessionId);
        simulationService.pauseSession(sessionId);
        assertThat(entity.getStatus()).isEqualTo(SimulationStatus.PAUSED);

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-rtl-full", droneId, flightId, "RTL", 1, "{}", "PENDING", ZonedDateTime.now()));

        assertThat(entity.getStatus()).isEqualTo(SimulationStatus.RUNNING);
        verify(ackPublisher).publishAck(eq("cmd-rtl-full"), eq(droneId), eq(flightId), eq("RTL"), eq("EXECUTING"), anyString());
        verify(ackPublisher, org.mockito.Mockito.never())
                .publishAck(eq("cmd-rtl-full"), anyString(), anyString(), anyString(), eq("COMPLETED"), anyString());

        for (int i = 0; i < 15 && entity.getStatus() == SimulationStatus.RUNNING; i++) {
            simulationService.stepSessionOnce(sessionId);
        }

        assertThat(entity.getStatus()).isEqualTo(SimulationStatus.COMPLETED);
        assertThat(entity.getCurrentAlt()).isEqualTo(0.0);
        verify(ackPublisher).publishAck(eq("cmd-rtl-full"), eq(droneId), eq(flightId), eq("RTL"), eq("COMPLETED"), anyString());
        verify(flightClientService).completeFlight(eq(flightId), eq("hub-dep-alpha"), any());
    }

    @Test
    @DisplayName("handleDroneCommand TAKEOFF auto-attaches runtime for AUTHORIZED flight and starts flight")
    void handleDroneCommand_takeoffOnAuthorizedFlight_autoStartsAndClimbs() {
        String sessionId = "sim-auto-tkof";
        String flightId = "flt-auto-tkof";
        String droneId = "drn-auto-tkof";
        var ackPublisher = org.mockito.Mockito.mock(com.utm.simulation.kafka.SimulationCommandAckPublisher.class);
        simulationService.setCommandAckPublisher(ackPublisher);

        GeoJsonLineStringVm route = new GeoJsonLineStringVm("LineString", List.of(
                List.of(106.7000, 10.7700, 40.0),
                List.of(106.7100, 10.7800, 40.0)));
        FlightDetailVm authorizedFlight = new FlightDetailVm(
                flightId, "FLT-TKOF-01", droneId, "hub-dep", "hub-arr", 40.0, route, 2,
                Collections.emptyList(), "authorized");
        SimulationSession entity = SimulationSession.builder()
                .id(sessionId)
                .flightId(flightId)
                .droneId(droneId)
                .status(SimulationStatus.RUNNING)
                .build();

        when(flightClientService.getFlightDetail(flightId)).thenReturn(authorizedFlight);
        when(flightClientService.startFlight(flightId)).thenReturn(true);
        when(simulationMapper.toEntity(any(SimulationSessionCreateVm.class))).thenReturn(entity);
        when(sessionRepository.saveAndFlush(entity)).thenReturn(entity);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(entity));
        when(sessionRepository.save(entity)).thenReturn(entity);
        when(simulationMapper.toEventEntity(eq(sessionId), anyString(), any(), anyString(), anyString(), any()))
                .thenReturn(SimulationEvent.builder().id("evt-tkof").sessionId(sessionId).build());
        when(eventRepository.save(any(SimulationEvent.class)))
                .thenReturn(SimulationEvent.builder().id("evt-tkof").sessionId(sessionId).build());

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-tkof-1", droneId, flightId, "TAKEOFF", 2, "{}", "PENDING", ZonedDateTime.now()));

        verify(flightClientService).startFlight(flightId);
        verify(ackPublisher).publishAck(eq("cmd-tkof-1"), eq(droneId), eq(flightId), eq("TAKEOFF"), eq("EXECUTING"), anyString());
        assertThat(entity.getCurrentAlt()).isEqualTo(0.0);

        for (int i = 0; i < 12; i++) {
            simulationService.stepSessionOnce(sessionId);
        }

        assertThat(entity.getCurrentAlt()).isGreaterThanOrEqualTo(39.5);
        verify(ackPublisher).publishAck(eq("cmd-tkof-1"), eq(droneId), eq(flightId), eq("TAKEOFF"), eq("COMPLETED"), anyString());
    }
}
