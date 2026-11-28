package com.utm.simulation.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.kafka.event.DroneCommandEvent;
import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
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
import com.utm.simulation.viewmodel.client.TelemetryLatestVm;
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

    @Test
    @DisplayName("injectScenario C2_LOST after TAKEOFF immediately stops drone movement and severs telemetry downlink")
    void injectScenario_c2LostAfterTakeoff_immediatelyHaltsDroneAndStopsTelemetry() {
        String sessionId = "sim-c2-after-tkof";
        String flightId = "flt-c2-after-tkof";
        String droneId = "drn-c2-after-tkof";

        GeoJsonLineStringVm route = new GeoJsonLineStringVm("LineString", List.of(
                List.of(106.7000, 10.7700, 40.0),
                List.of(106.7200, 10.7900, 40.0)));
        FlightDetailVm authorizedFlight = new FlightDetailVm(
                flightId, "FLT-C2-TKOF", droneId, "hub-dep", "hub-arr", 40.0, route, 2,
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
                .thenReturn(SimulationEvent.builder().id("evt-c2").sessionId(sessionId).build());
        when(eventRepository.save(any(SimulationEvent.class)))
                .thenReturn(SimulationEvent.builder().id("evt-c2").sessionId(sessionId).build());

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-tkof-c2", droneId, flightId, "TAKEOFF", 2, "{}", "PENDING", ZonedDateTime.now()));

        for (int i = 0; i < 12; i++) {
            simulationService.stepSessionOnce(sessionId);
        }
        assertThat(entity.getCurrentAlt()).isGreaterThanOrEqualTo(39.5);

        org.mockito.Mockito.clearInvocations(telemetryClientService);
        simulationService.injectScenario(sessionId, new com.utm.simulation.viewmodel.scenario.InjectScenarioVm(
                com.utm.simulation.model.enumeration.EmergencyScenarioType.C2_LOST, null));
        assertThat(entity.getSpeed()).isEqualTo(0.0);

        for (int i = 0; i < 5; i++) {
            simulationService.stepSessionOnce(sessionId);
        }
        double frozenLat = entity.getCurrentLat();
        double frozenLon = entity.getCurrentLon();
        for (int i = 0; i < 5; i++) {
            simulationService.stepSessionOnce(sessionId);
        }

        assertThat(entity.getSpeed()).isEqualTo(0.0);
        assertThat(entity.getCurrentLat()).isEqualTo(frozenLat);
        assertThat(entity.getCurrentLon()).isEqualTo(frozenLon);
        verify(telemetryClientService, org.mockito.Mockito.never()).pushTelemetry(any(), any());
        verify(telemetryClientService, org.mockito.Mockito.never()).pushTelemetry(any());
    }

    @Test
    @DisplayName("handleDroneCommand CONFIGURE updates cruise speed and SET_HOME updates RTH home pad with COMPLETED ACKs")
    void handleDroneCommand_configureAndSetHome_updatesCruiseSpeedAndHomePadWithCompletedAcks() {
        String sessionId = "sim-cfg-home";
        String flightId = "flt-cfg-home";
        String droneId = "drn-cfg-home";
        var ackPublisher = org.mockito.Mockito.mock(com.utm.simulation.kafka.SimulationCommandAckPublisher.class);
        simulationService.setCommandAckPublisher(ackPublisher);

        GeoJsonLineStringVm route = new GeoJsonLineStringVm("LineString", List.of(
                List.of(106.7000, 10.7700, 50.0),
                List.of(106.7200, 10.7900, 50.0)));
        FlightDetailVm activeFlight = new FlightDetailVm(
                flightId, "FLT-CFG-01", droneId, "hub-dep-orig", "hub-arr-orig", 50.0, route, 2,
                Collections.emptyList(), "active");
        SimulationSession entity = SimulationSession.builder()
                .id(sessionId)
                .flightId(flightId)
                .droneId(droneId)
                .status(SimulationStatus.RUNNING)
                .speed(15.0)
                .timeScale(5.0)
                .currentBattery(90.0)
                .build();
        SimulationSessionVm vm = new SimulationSessionVm(
                sessionId, flightId, droneId, SimulationStatus.RUNNING, 15.0, 5.0,
                10.7700, 106.7000, 50.0, 45.0, 90.0, 0.0, 3000.0, 0.0, 0, null,
                ZonedDateTime.now(), ZonedDateTime.now());
        SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(flightId, 15.0, 5.0, 90.0);

        when(flightClientService.getFlightDetail(flightId)).thenReturn(activeFlight);
        when(sessionRepository.existsByDroneIdAndStatusIn(eq(droneId), anyList())).thenReturn(false);
        when(sessionRepository.existsByFlightIdAndStatusIn(eq(flightId), anyList())).thenReturn(false);
        when(simulationMapper.toEntity(createVm)).thenReturn(entity);
        when(sessionRepository.saveAndFlush(entity)).thenReturn(entity);
        when(simulationMapper.toVm(entity)).thenReturn(vm);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(entity));
        when(sessionRepository.save(entity)).thenReturn(entity);
        when(simulationMapper.toEventEntity(eq(sessionId), anyString(), any(), anyString(), anyString(), any()))
                .thenReturn(SimulationEvent.builder().id("evt-cfg").sessionId(sessionId).build());
        when(eventRepository.save(any(SimulationEvent.class)))
                .thenReturn(SimulationEvent.builder().id("evt-cfg").sessionId(sessionId).build());

        simulationService.createSession(createVm);

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-cfg-1", droneId, flightId, "CONFIGURE", 3,
                "{\"targetSpeedMps\": 24.5}", "PENDING", ZonedDateTime.now()));

        assertThat(entity.getSpeed()).isEqualTo(24.5);
        verify(ackPublisher).publishAck(eq("cmd-cfg-1"), eq(droneId), eq(flightId), eq("CONFIGURE"), eq("ACKNOWLEDGED"), anyString());
        verify(ackPublisher).publishAck(eq("cmd-cfg-1"), eq(droneId), eq(flightId), eq("CONFIGURE"), eq("COMPLETED"), anyString());

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-home-1", droneId, flightId, "SET_HOME", 3,
                "{\"latitude\": 10.7702, \"longitude\": 106.7002, \"targetHubId\": \"hub-alt-home\"}",
                "PENDING", ZonedDateTime.now()));

        verify(ackPublisher).publishAck(eq("cmd-home-1"), eq(droneId), eq(flightId), eq("SET_HOME"), eq("ACKNOWLEDGED"), anyString());
        verify(ackPublisher).publishAck(eq("cmd-home-1"), eq(droneId), eq(flightId), eq("SET_HOME"), eq("COMPLETED"), anyString());

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-rtl-home", droneId, flightId, "RTL", 1, "{}", "PENDING", ZonedDateTime.now()));
        for (int i = 0; i < 15 && entity.getStatus() == SimulationStatus.RUNNING; i++) {
            simulationService.stepSessionOnce(sessionId);
        }

        assertThat(entity.getStatus()).isEqualTo(SimulationStatus.COMPLETED);
        verify(flightClientService).completeFlight(eq(flightId), eq("hub-alt-home"), any());
    }

    @Test
    @DisplayName("handleDroneCommand GOTO with targetHubId executes 3D approach and completes landing at alternate hub")
    void handleDroneCommand_gotoWithTargetHubId_landsAndCompletesAtAlternateHub() {
        String sessionId = "sim-divert-hub";
        String flightId = "flt-divert-hub";
        String droneId = "drn-divert-hub";
        var ackPublisher = org.mockito.Mockito.mock(com.utm.simulation.kafka.SimulationCommandAckPublisher.class);
        simulationService.setCommandAckPublisher(ackPublisher);

        GeoJsonLineStringVm route = new GeoJsonLineStringVm("LineString", List.of(
                List.of(106.7000, 10.7700, 50.0),
                List.of(106.7200, 10.7900, 50.0)));
        FlightDetailVm activeFlight = new FlightDetailVm(
                flightId, "FLT-DIV-01", droneId, "hub-dep-alpha", "hub-arr-bravo", 50.0, route, 2,
                Collections.emptyList(), "active");
        SimulationSession entity = SimulationSession.builder()
                .id(sessionId)
                .flightId(flightId)
                .droneId(droneId)
                .status(SimulationStatus.RUNNING)
                .speed(20.0)
                .timeScale(5.0)
                .currentBattery(88.0)
                .build();
        SimulationSessionVm vm = new SimulationSessionVm(
                sessionId, flightId, droneId, SimulationStatus.RUNNING, 20.0, 5.0,
                10.7700, 106.7000, 50.0, 45.0, 88.0, 0.0, 3000.0, 0.0, 0, null,
                ZonedDateTime.now(), ZonedDateTime.now());
        SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(flightId, 20.0, 5.0, 88.0);

        when(flightClientService.getFlightDetail(flightId)).thenReturn(activeFlight);
        when(sessionRepository.existsByDroneIdAndStatusIn(eq(droneId), anyList())).thenReturn(false);
        when(sessionRepository.existsByFlightIdAndStatusIn(eq(flightId), anyList())).thenReturn(false);
        when(simulationMapper.toEntity(createVm)).thenReturn(entity);
        when(sessionRepository.saveAndFlush(entity)).thenReturn(entity);
        when(simulationMapper.toVm(entity)).thenReturn(vm);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(entity));
        when(sessionRepository.save(entity)).thenReturn(entity);
        when(simulationMapper.toEventEntity(eq(sessionId), anyString(), any(), anyString(), anyString(), any()))
                .thenReturn(SimulationEvent.builder().id("evt-div").sessionId(sessionId).build());
        when(eventRepository.save(any(SimulationEvent.class)))
                .thenReturn(SimulationEvent.builder().id("evt-div").sessionId(sessionId).build());

        simulationService.createSession(createVm);
        org.mockito.Mockito.clearInvocations(telemetryClientService);

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-goto-hub", droneId, flightId, "GOTO", 2,
                "{\"latitude\": 10.7704, \"longitude\": 106.7004, \"targetHubId\": \"hub-divert-charlie\"}",
                "PENDING", ZonedDateTime.now()));

        simulationService.stepSessionOnce(sessionId);
        var telCaptor = org.mockito.ArgumentCaptor.forClass(com.utm.simulation.viewmodel.client.TelemetryPushVm.class);
        verify(telemetryClientService, atLeastOnce()).pushTelemetry(telCaptor.capture());
        assertThat(telCaptor.getValue().flightMode()).isEqualTo("DIVERT");
        assertThat(telCaptor.getValue().altitudeAgl()).isNotNull();
        assertThat(telCaptor.getValue().batteryVoltage()).isGreaterThan(43.2);
        assertThat(telCaptor.getValue().batteryTemperature()).isGreaterThan(31.5);
        assertThat(telCaptor.getValue().batteryDischargeRate()).isGreaterThan(0.0);

        for (int i = 0; i < 15 && entity.getStatus() == SimulationStatus.RUNNING; i++) {
            simulationService.stepSessionOnce(sessionId);
        }

        assertThat(entity.getStatus()).isEqualTo(SimulationStatus.COMPLETED);
        assertThat(entity.getCurrentAlt()).isEqualTo(0.0);
        verify(ackPublisher).publishAck(
                eq("cmd-goto-hub"), eq(droneId), eq(flightId), eq("GOTO"), eq("COMPLETED"),
                org.mockito.ArgumentMatchers.contains("Diverted landing completed at alternate hub"));
        verify(flightClientService).completeFlight(eq(flightId), eq("hub-divert-charlie"), any());
    }

    @Test
    @DisplayName("handleDroneCommand SET_ALTITUDE emits ALTITUDE_CHANGE, clears override on reaching target, and descends to 0m at arrival hub")
    void handleDroneCommand_setAltitude_emitsAltitudeChangeClearsOverrideAndLandsAtArrivalHub() {
        String sessionId = "sim-alt-mode";
        String flightId = "flt-alt-mode";
        String droneId = "drn-alt-mode";
        var ackPublisher = org.mockito.Mockito.mock(com.utm.simulation.kafka.SimulationCommandAckPublisher.class);
        simulationService.setCommandAckPublisher(ackPublisher);

        GeoJsonLineStringVm route = new GeoJsonLineStringVm("LineString", List.of(
                List.of(106.7000, 10.7700, 50.0),
                List.of(106.7020, 10.7700, 50.0),
                List.of(106.7020, 10.7700, 0.0)));
        FlightDetailVm activeFlight = new FlightDetailVm(
                flightId, "FLT-ALT-01", droneId, "hub-1", "hub-2", 50.0, route, 3,
                Collections.emptyList(), "active");
        SimulationSession entity = SimulationSession.builder()
                .id(sessionId)
                .flightId(flightId)
                .droneId(droneId)
                .status(SimulationStatus.RUNNING)
                .speed(20.0)
                .timeScale(2.0)
                .currentBattery(90.0)
                .build();
        SimulationSessionVm vm = new SimulationSessionVm(
                sessionId, flightId, droneId, SimulationStatus.RUNNING, 20.0, 2.0,
                10.7700, 106.7000, 50.0, 90.0, 90.0, 0.0, 280.0, 0.0, 0, null,
                ZonedDateTime.now(), ZonedDateTime.now());
        SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(flightId, 20.0, 2.0, 90.0);

        when(flightClientService.getFlightDetail(flightId)).thenReturn(activeFlight);
        when(sessionRepository.existsByDroneIdAndStatusIn(eq(droneId), anyList())).thenReturn(false);
        when(sessionRepository.existsByFlightIdAndStatusIn(eq(flightId), anyList())).thenReturn(false);
        when(simulationMapper.toEntity(createVm)).thenReturn(entity);
        when(sessionRepository.saveAndFlush(entity)).thenReturn(entity);
        when(simulationMapper.toVm(entity)).thenReturn(vm);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(entity));
        when(sessionRepository.save(entity)).thenReturn(entity);
        when(simulationMapper.toEventEntity(eq(sessionId), anyString(), any(), anyString(), anyString(), any()))
                .thenReturn(SimulationEvent.builder().id("evt-alt").sessionId(sessionId).build());
        when(eventRepository.save(any(SimulationEvent.class)))
                .thenReturn(SimulationEvent.builder().id("evt-alt").sessionId(sessionId).build());

        simulationService.createSession(createVm);
        org.mockito.Mockito.clearInvocations(telemetryClientService);

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-alt-62", droneId, flightId, "SET_ALTITUDE", 2,
                "{\"targetAltitude\": 62.0}", "PENDING", ZonedDateTime.now()));

        simulationService.stepSessionOnce(sessionId);

        var telCaptor = org.mockito.ArgumentCaptor.forClass(com.utm.simulation.viewmodel.client.TelemetryPushVm.class);
        verify(telemetryClientService, atLeastOnce()).pushTelemetry(telCaptor.capture());
        var pushed = telCaptor.getValue();
        assertThat(pushed.flightMode()).isEqualTo("ALTITUDE_CHANGE");
        assertThat(pushed.verticalSpeed()).isEqualTo(4.0);
        assertThat(pushed.pitch()).isNotNull();
        assertThat(pushed.roll()).isNotNull();
        assertThat(pushed.altitudeAgl()).isGreaterThan(45.0);
        assertThat(pushed.batteryVoltage()).isGreaterThan(48.0);
        assertThat(pushed.batteryTemperature()).isGreaterThan(35.0);
        assertThat(pushed.batteryDischargeRate()).isGreaterThan(280.0);

        for (int i = 0; i < 20 && entity.getStatus() == SimulationStatus.RUNNING; i++) {
            simulationService.stepSessionOnce(sessionId);
        }

        verify(ackPublisher).publishAck(eq("cmd-alt-62"), eq(droneId), eq(flightId), eq("SET_ALTITUDE"), eq("COMPLETED"), anyString());
        assertThat(entity.getStatus()).isEqualTo(SimulationStatus.COMPLETED);
        assertThat(entity.getCurrentAlt()).isEqualTo(0.0);
        verify(flightClientService).completeFlight(eq(flightId), eq("hub-2"), any());
    }

    @Test
    @DisplayName("handleDroneCommand tactical GOTO without targetHubId holds LOITER across multiple ticks without completing until RESUME")
    void handleDroneCommand_tacticalGotoWithoutTargetHubId_loitersAcrossMultipleTicksUntilResume() {
        String sessionId = "sim-goto-loiter";
        String flightId = "flt-goto-loiter";
        String droneId = "drn-goto-loiter";
        var ackPublisher = org.mockito.Mockito.mock(com.utm.simulation.kafka.SimulationCommandAckPublisher.class);
        simulationService.setCommandAckPublisher(ackPublisher);

        GeoJsonLineStringVm route = new GeoJsonLineStringVm("LineString", List.of(
                List.of(106.7000, 10.7700, 60.0),
                List.of(106.7015, 10.7715, 60.0),
                List.of(106.7015, 10.7715, 0.0)));
        FlightDetailVm activeFlight = new FlightDetailVm(
                flightId, "FLT-LOITER-01", droneId, "hub-dep-alpha", "hub-arr-bravo", 60.0, route, 3,
                Collections.emptyList(), "active");
        SimulationSession entity = SimulationSession.builder()
                .id(sessionId)
                .flightId(flightId)
                .droneId(droneId)
                .status(SimulationStatus.RUNNING)
                .speed(20.0)
                .timeScale(5.0)
                .currentBattery(90.0)
                .build();
        SimulationSessionVm vm = new SimulationSessionVm(
                sessionId, flightId, droneId, SimulationStatus.RUNNING, 20.0, 5.0,
                10.7700, 106.7000, 60.0, 45.0, 90.0, 0.0, 300.0, 0.0, 0, null,
                ZonedDateTime.now(), ZonedDateTime.now());
        SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(flightId, 20.0, 5.0, 90.0);

        when(flightClientService.getFlightDetail(flightId)).thenReturn(activeFlight);
        when(sessionRepository.existsByDroneIdAndStatusIn(eq(droneId), anyList())).thenReturn(false);
        when(sessionRepository.existsByFlightIdAndStatusIn(eq(flightId), anyList())).thenReturn(false);
        when(simulationMapper.toEntity(createVm)).thenReturn(entity);
        when(sessionRepository.saveAndFlush(entity)).thenReturn(entity);
        when(simulationMapper.toVm(entity)).thenReturn(vm);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(entity));
        when(sessionRepository.save(entity)).thenReturn(entity);
        when(simulationMapper.toEventEntity(eq(sessionId), anyString(), any(), anyString(), anyString(), any()))
                .thenReturn(SimulationEvent.builder().id("evt-loiter").sessionId(sessionId).build());
        when(eventRepository.save(any(SimulationEvent.class)))
                .thenReturn(SimulationEvent.builder().id("evt-loiter").sessionId(sessionId).build());

        simulationService.createSession(createVm);

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-goto-pt", droneId, flightId, "GOTO", 2,
                "{\"latitude\": 10.7704, \"longitude\": 106.7004, \"altitude\": 70.0}",
                "PENDING", ZonedDateTime.now()));

        simulationService.stepSessionOnce(sessionId);
        simulationService.stepSessionOnce(sessionId);
        verify(ackPublisher).publishAck(
                eq("cmd-goto-pt"), eq(droneId), eq(flightId), eq("GOTO"), eq("COMPLETED"),
                org.mockito.ArgumentMatchers.contains("holding position"));

        org.mockito.Mockito.clearInvocations(telemetryClientService);
        simulationService.stepSessionOnce(sessionId);
        simulationService.stepSessionOnce(sessionId);
        simulationService.stepSessionOnce(sessionId);

        assertThat(entity.getStatus()).isEqualTo(SimulationStatus.RUNNING);
        verify(flightClientService, org.mockito.Mockito.never()).completeFlight(anyString(), anyString(), any());
        verify(flightClientService, org.mockito.Mockito.never()).completeFlight(anyString());
        var loiterCaptor = org.mockito.ArgumentCaptor.forClass(com.utm.simulation.viewmodel.client.TelemetryPushVm.class);
        verify(telemetryClientService, atLeastOnce()).pushTelemetry(loiterCaptor.capture());
        assertThat(loiterCaptor.getAllValues()).allSatisfy(tel -> {
            assertThat(tel.flightMode()).isEqualTo("LOITER");
            assertThat(tel.altitude()).isGreaterThan(68.0);
        });

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-resume-after-goto", droneId, flightId, "RESUME", 2, "{}", "PENDING", ZonedDateTime.now()));
        for (int i = 0; i < 15 && entity.getStatus() == SimulationStatus.RUNNING; i++) {
            simulationService.stepSessionOnce(sessionId);
        }

        assertThat(entity.getStatus()).isEqualTo(SimulationStatus.COMPLETED);
        assertThat(entity.getCurrentAlt()).isEqualTo(0.0);
        verify(flightClientService).completeFlight(eq(flightId), eq("hub-arr-bravo"), any());
    }

    @Test
    @DisplayName("handleFlightStarted auto-creates RUNNING session with TAKEOFF climb mode, LANDING terminal mode, and terminates cleanly on FLIGHT_COMPLETED")
    void handleFlightStarted_autoCreatesRunningSessionWithTakeoffAndLandingModes() {
        String sessionId = "sim-flt-started-1";
        String flightId = "flt-started-1";
        String droneId = "drn-started-1";

        GeoJsonLineStringVm route = new GeoJsonLineStringVm("LineString", List.of(
                List.of(106.7000, 10.7700, 0.0),
                List.of(106.7000, 10.7700, 30.0),
                List.of(106.7003, 10.7700, 30.0),
                List.of(106.7003, 10.7700, 0.0)));
        FlightDetailVm activeFlight = new FlightDetailVm(
                flightId, "FLT-AUTO-01", droneId, "hub-dep-1", "hub-arr-1", 30.0, route, 4,
                Collections.emptyList(), "active");
        SimulationSession entity = SimulationSession.builder()
                .id(sessionId)
                .flightId(flightId)
                .droneId(droneId)
                .status(SimulationStatus.RUNNING)
                .speed(15.0)
                .timeScale(2.0)
                .currentBattery(100.0)
                .build();

        when(sessionRepository.existsByFlightIdAndStatusIn(eq(flightId), anyList())).thenReturn(false);
        when(sessionRepository.existsByDroneIdAndStatusIn(eq(droneId), anyList())).thenReturn(false);
        when(telemetryClientService.getLatestFlightTelemetry(flightId)).thenReturn(Optional.empty());
        when(flightClientService.getFlightDetail(flightId)).thenReturn(activeFlight);
        when(simulationMapper.toEntity(any(SimulationSessionCreateVm.class))).thenReturn(entity);
        when(sessionRepository.saveAndFlush(entity)).thenReturn(entity);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(entity));
        when(sessionRepository.save(entity)).thenReturn(entity);

        FlightLifecycleEvent startedEvent = new FlightLifecycleEvent(
                FlightLifecycleEvent.FLIGHT_STARTED, flightId, "FLT-AUTO-01", "msn-1", "exec-1",
                0, 1, droneId, "hub-dep-1", "hub-arr-1", null, "active", null, null, null, ZonedDateTime.now());

        simulationService.handleFlightStarted(startedEvent);

        assertThat(entity.getStatus()).isEqualTo(SimulationStatus.RUNNING);
        assertThat(entity.getFlightPhase()).isEqualTo("TAKEOFF");
        assertThat(entity.getCurrentAlt()).isEqualTo(0.0);

        simulationService.stepSessionOnce(sessionId);
        var telCaptor = org.mockito.ArgumentCaptor.forClass(com.utm.simulation.viewmodel.client.TelemetryPushVm.class);
        verify(telemetryClientService, atLeastOnce()).pushTelemetry(telCaptor.capture());
        assertThat(telCaptor.getAllValues().getFirst().flightMode()).isEqualTo("TAKEOFF");

        org.mockito.Mockito.clearInvocations(telemetryClientService);
        for (int i = 0; i < 14; i++) {
            simulationService.stepSessionOnce(sessionId);
        }
        var modesCaptor = org.mockito.ArgumentCaptor.forClass(com.utm.simulation.viewmodel.client.TelemetryPushVm.class);
        verify(telemetryClientService, atLeastOnce()).pushTelemetry(modesCaptor.capture());
        assertThat(modesCaptor.getAllValues())
                .extracting(com.utm.simulation.viewmodel.client.TelemetryPushVm::flightMode)
                .contains("TAKEOFF", "AUTONOMOUS", "LANDING");

        simulationService.handleFlightTerminated(flightId, FlightLifecycleEvent.FLIGHT_CANCELLED);
        assertThat(entity.getStatus()).isEqualTo(SimulationStatus.STOPPED);
        verify(flightClientService, org.mockito.Mockito.never()).abortFlight(anyString(), anyString());
    }

    @Test
    @DisplayName("handleDroneCommand TAKEOFF succeeds when startFlight returns false due to Kafka race and flight is already active")
    void handleDroneCommand_takeoffKafkaRaceWhenStartFlightReturnsFalse_bootstrapsRuntimeAndAcks() {
        String sessionId = "sim-tkof-race";
        String flightId = "flt-tkof-race";
        String droneId = "drn-tkof-race";
        var ackPublisher = org.mockito.Mockito.mock(com.utm.simulation.kafka.SimulationCommandAckPublisher.class);
        simulationService.setCommandAckPublisher(ackPublisher);

        GeoJsonLineStringVm route = new GeoJsonLineStringVm("LineString", List.of(
                List.of(106.7000, 10.7700, 0.0),
                List.of(106.7000, 10.7700, 50.0),
                List.of(106.7100, 10.7800, 50.0),
                List.of(106.7100, 10.7800, 0.0)));
        FlightDetailVm authorizedSnapshot = new FlightDetailVm(
                flightId, "FLT-RACE-01", droneId, "hub-dep", "hub-arr", 50.0, route, 4,
                Collections.emptyList(), "authorized");
        FlightDetailVm activeSnapshot = new FlightDetailVm(
                flightId, "FLT-RACE-01", droneId, "hub-dep", "hub-arr", 50.0, route, 4,
                Collections.emptyList(), "active");
        SimulationSession entity = SimulationSession.builder()
                .id(sessionId)
                .flightId(flightId)
                .droneId(droneId)
                .status(SimulationStatus.RUNNING)
                .build();

        when(flightClientService.getFlightDetail(flightId)).thenReturn(authorizedSnapshot, activeSnapshot);
        when(flightClientService.startFlight(flightId)).thenReturn(false);
        when(simulationMapper.toEntity(any(SimulationSessionCreateVm.class))).thenReturn(entity);
        when(sessionRepository.saveAndFlush(entity)).thenReturn(entity);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(entity));
        when(simulationMapper.toEventEntity(eq(sessionId), anyString(), any(), anyString(), anyString(), any()))
                .thenReturn(SimulationEvent.builder().id("evt-race").sessionId(sessionId).build());
        when(eventRepository.save(any(SimulationEvent.class)))
                .thenReturn(SimulationEvent.builder().id("evt-race").sessionId(sessionId).build());

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-tkof-race", droneId, flightId, "TAKEOFF", 2, "{}", "PENDING", ZonedDateTime.now()));

        verify(ackPublisher).publishAck(eq("cmd-tkof-race"), eq(droneId), eq(flightId), eq("TAKEOFF"), eq("ACKNOWLEDGED"), anyString());
        verify(ackPublisher).publishAck(eq("cmd-tkof-race"), eq(droneId), eq(flightId), eq("TAKEOFF"), eq("EXECUTING"), anyString());
        verify(ackPublisher, org.mockito.Mockito.never())
                .publishAck(eq("cmd-tkof-race"), anyString(), anyString(), anyString(), eq("FAILED"), anyString());
    }

    @Test
    @DisplayName("handleFlightStarted and handleDroneCommand TAKEOFF create at most one session idempotently")
    void handleFlightStartedAndTakeoffCommand_createsSingleSessionIdempotently() {
        String sessionId = "sim-idem-1";
        String flightId = "flt-idem-1";
        String droneId = "drn-idem-1";
        var ackPublisher = org.mockito.Mockito.mock(com.utm.simulation.kafka.SimulationCommandAckPublisher.class);
        simulationService.setCommandAckPublisher(ackPublisher);

        GeoJsonLineStringVm route = new GeoJsonLineStringVm("LineString", List.of(
                List.of(106.7000, 10.7700, 0.0),
                List.of(106.7000, 10.7700, 60.0),
                List.of(106.7150, 10.7850, 60.0),
                List.of(106.7150, 10.7850, 0.0)));
        FlightDetailVm activeFlight = new FlightDetailVm(
                flightId, "FLT-IDEM-01", droneId, "hub-dep", "hub-arr", 60.0, route, 4,
                Collections.emptyList(), "active");
        SimulationSession entity = SimulationSession.builder()
                .id(sessionId)
                .flightId(flightId)
                .droneId(droneId)
                .status(SimulationStatus.RUNNING)
                .build();

        when(sessionRepository.existsByFlightIdAndStatusIn(eq(flightId), anyList())).thenReturn(false);
        when(sessionRepository.existsByDroneIdAndStatusIn(eq(droneId), anyList())).thenReturn(false);
        when(telemetryClientService.getLatestFlightTelemetry(flightId)).thenReturn(Optional.empty());
        when(flightClientService.getFlightDetail(flightId)).thenReturn(activeFlight);
        when(simulationMapper.toEntity(any(SimulationSessionCreateVm.class))).thenReturn(entity);
        when(sessionRepository.saveAndFlush(entity)).thenReturn(entity);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(entity));
        when(simulationMapper.toEventEntity(eq(sessionId), anyString(), any(), anyString(), anyString(), any()))
                .thenReturn(SimulationEvent.builder().id("evt-idem").sessionId(sessionId).build());
        when(eventRepository.save(any(SimulationEvent.class)))
                .thenReturn(SimulationEvent.builder().id("evt-idem").sessionId(sessionId).build());

        FlightLifecycleEvent startedEvent = new FlightLifecycleEvent(
                FlightLifecycleEvent.FLIGHT_STARTED, flightId, "FLT-IDEM-01", null, null,
                null, null, droneId, "hub-dep", "hub-arr", null, "active", null, null, null, ZonedDateTime.now());

        simulationService.handleFlightStarted(startedEvent);
        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-idem-tkof", droneId, flightId, "TAKEOFF", 2, "{}", "PENDING", ZonedDateTime.now()));
        simulationService.handleFlightStarted(startedEvent);

        verify(sessionRepository, org.mockito.Mockito.times(1)).saveAndFlush(any(SimulationSession.class));
        verify(ackPublisher).publishAck(eq("cmd-idem-tkof"), eq(droneId), eq(flightId), eq("TAKEOFF"), eq("EXECUTING"), anyString());
    }

    @Test
    @DisplayName("real-hardware telemetry with fresh non-simulation source skips simulation auto-bootstrap")
    void handleFlightStartedAndTakeoff_whenFreshExternalTelemetryPresent_skipsAutoBootstrap() {
        String flightId = "flt-hw-1";
        String droneId = "drn-hw-1";
        var ackPublisher = org.mockito.Mockito.mock(com.utm.simulation.kafka.SimulationCommandAckPublisher.class);
        simulationService.setCommandAckPublisher(ackPublisher);

        TelemetryLatestVm oemTelemetry = new TelemetryLatestVm(
                droneId, flightId, 10.7769, 106.7009, 25.0, 8.0, 90.0, 96.0, ZonedDateTime.now(), "oem_api");
        when(sessionRepository.existsByFlightIdAndStatusIn(eq(flightId), anyList())).thenReturn(false);
        when(telemetryClientService.getLatestFlightTelemetry(flightId)).thenReturn(Optional.of(oemTelemetry));

        FlightLifecycleEvent startedEvent = new FlightLifecycleEvent(
                FlightLifecycleEvent.FLIGHT_STARTED, flightId, "FLT-HW-01", null, null,
                null, null, droneId, "hub-dep", "hub-arr", null, "active", null, null, null, ZonedDateTime.now());

        simulationService.handleFlightStarted(startedEvent);
        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-hw-tkof", droneId, flightId, "TAKEOFF", 2, "{}", "PENDING", ZonedDateTime.now()));

        verify(sessionRepository, org.mockito.Mockito.never()).saveAndFlush(any(SimulationSession.class));
        verify(ackPublisher, org.mockito.Mockito.never())
                .publishAck(anyString(), anyString(), anyString(), anyString(), eq("FAILED"), anyString());
    }

    @Test
    @DisplayName("handleDroneCommand RESUME after off-track GOTO intercepts planned leg orthogonally instead of backtracking to passed waypoint")
    void handleDroneCommand_gotoOffTrackPastIntermediateWaypointThenResume_interceptsCorridorOrthogonally() {
        String sessionId = "sim-ortho-resume";
        String flightId = "flt-ortho-resume";
        String droneId = "drn-ortho-resume";

        GeoJsonLineStringVm route = new GeoJsonLineStringVm("LineString", List.of(
                List.of(106.7009, 10.7769, 0.0),
                List.of(106.7009, 10.7769, 110.0),
                List.of(106.7185, 10.7805, 110.0),
                List.of(106.7350, 10.7850, 110.0),
                List.of(106.7350, 10.7850, 0.0)));
        FlightDetailVm activeFlight = new FlightDetailVm(
                flightId, "FL-2026-006", droneId, "hub-d1", "hub-tt", 110.0, route, 5,
                Collections.emptyList(), "active");
        SimulationSession entity = SimulationSession.builder()
                .id(sessionId)
                .flightId(flightId)
                .droneId(droneId)
                .status(SimulationStatus.RUNNING)
                .speed(20.0)
                .timeScale(1.0)
                .currentBattery(95.0)
                .build();
        SimulationSessionVm vm = new SimulationSessionVm(
                sessionId, flightId, droneId, SimulationStatus.RUNNING, 20.0, 1.0,
                10.7769, 106.7009, 0.0, 75.0, 95.0, 0.0, 3800.0, 0.0, 0, null,
                ZonedDateTime.now(), ZonedDateTime.now());
        SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(flightId, 20.0, 1.0, 95.0);

        when(flightClientService.getFlightDetail(flightId)).thenReturn(activeFlight);
        when(sessionRepository.existsByDroneIdAndStatusIn(eq(droneId), anyList())).thenReturn(false);
        when(sessionRepository.existsByFlightIdAndStatusIn(eq(flightId), anyList())).thenReturn(false);
        when(simulationMapper.toEntity(createVm)).thenReturn(entity);
        when(sessionRepository.saveAndFlush(entity)).thenReturn(entity);
        when(simulationMapper.toVm(entity)).thenReturn(vm);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(entity));
        when(sessionRepository.save(entity)).thenReturn(entity);
        when(simulationMapper.toEventEntity(eq(sessionId), anyString(), any(), anyString(), anyString(), any()))
                .thenReturn(SimulationEvent.builder().id("evt-ortho").sessionId(sessionId).build());
        when(eventRepository.save(any(SimulationEvent.class)))
                .thenReturn(SimulationEvent.builder().id("evt-ortho").sessionId(sessionId).build());

        simulationService.createSession(createVm);

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-goto-east-of-wp2", droneId, flightId, "GOTO", 2,
                "{\"latitude\": 10.780413, \"longitude\": 106.720144, \"altitude\": 145.0}",
                "PENDING", ZonedDateTime.now()));
        entity.setTimeScale(20.0);
        simulationService.updateTimeScale(sessionId, 20.0);
        for (int i = 0; i < 8; i++) {
            simulationService.stepSessionOnce(sessionId);
        }
        assertThat(entity.getCurrentLon()).isCloseTo(106.720144, org.assertj.core.data.Offset.offset(0.0005));
        assertThat(entity.getCurrentLat()).isCloseTo(10.780413, org.assertj.core.data.Offset.offset(0.0005));

        simulationService.updateTimeScale(sessionId, 1.0);
        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-resume-ortho", droneId, flightId, "RESUME", 2, "{}", "PENDING", ZonedDateTime.now()));

        double interceptHeading = entity.getCurrentHeading();
        assertThat(interceptHeading >= 335.0 || interceptHeading <= 20.0)
                .as("Intercept heading (%s deg) must point perpendicularly North (~345 deg) into WP2->WP3 leg, never West (~273 deg) back to WP2 or shallow East (~75 deg) direct to WP3",
                        interceptHeading)
                .isTrue();

        org.mockito.Mockito.clearInvocations(telemetryClientService);
        for (int i = 0; i < 12; i++) {
            simulationService.stepSessionOnce(sessionId);
        }
        var orthoTelCaptor = org.mockito.ArgumentCaptor.forClass(com.utm.simulation.viewmodel.client.TelemetryPushVm.class);
        verify(telemetryClientService, atLeastOnce()).pushTelemetry(orthoTelCaptor.capture());
        assertThat(orthoTelCaptor.getAllValues())
                .allSatisfy(t -> assertThat(t.verticalSpeed()).isGreaterThanOrEqualTo(-3.5));
        assertThat(orthoTelCaptor.getAllValues())
                .extracting(com.utm.simulation.viewmodel.client.TelemetryPushVm::flightMode)
                .contains("ALTITUDE_CHANGE", "AUTONOMOUS");
        assertThat(entity.getCurrentLon()).isGreaterThan(106.7198);
        assertThat(entity.getCurrentAlt()).isCloseTo(110.0, org.assertj.core.data.Offset.offset(2.0));
    }

    @Test
    @DisplayName("SET_ALTITUDE 120m followed by RESUME glides smoothly back to 110m at -3.5 m/s with ALTITUDE_CHANGE mode and never triggers false MOTOR_FAILURE")
    void handleDroneCommand_setAltitudeThenResume_glidesSmoothlyWithoutFalseMotorFailure() {
        String sessionId = "sim-fl006-repro";
        String flightId = "flt-fl006-repro";
        String droneId = "drn-fl006-repro";

        GeoJsonLineStringVm route = new GeoJsonLineStringVm("LineString", List.of(
                List.of(106.7009, 10.7769, 0.0),
                List.of(106.7009, 10.7769, 110.0),
                List.of(106.7185, 10.7805, 110.0),
                List.of(106.7350, 10.7850, 110.0),
                List.of(106.7350, 10.7850, 0.0)));
        FlightDetailVm activeFlight = new FlightDetailVm(
                flightId, "FL-2026-006", droneId, "hub-d1", "hub-tt", 110.0, route, 5,
                Collections.emptyList(), "active");
        SimulationSession entity = SimulationSession.builder()
                .id(sessionId)
                .flightId(flightId)
                .droneId(droneId)
                .status(SimulationStatus.RUNNING)
                .speed(16.0)
                .timeScale(1.0)
                .currentBattery(99.0)
                .build();
        SimulationSessionVm vm = new SimulationSessionVm(
                sessionId, flightId, droneId, SimulationStatus.RUNNING, 16.0, 1.0,
                10.7769, 106.7009, 0.0, 75.0, 99.0, 0.0, 3800.0, 0.0, 0, null,
                ZonedDateTime.now(), ZonedDateTime.now());
        SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(flightId, 16.0, 1.0, 99.0);

        when(flightClientService.getFlightDetail(flightId)).thenReturn(activeFlight);
        when(sessionRepository.existsByDroneIdAndStatusIn(eq(droneId), anyList())).thenReturn(false);
        when(sessionRepository.existsByFlightIdAndStatusIn(eq(flightId), anyList())).thenReturn(false);
        when(simulationMapper.toEntity(createVm)).thenReturn(entity);
        when(sessionRepository.saveAndFlush(entity)).thenReturn(entity);
        when(simulationMapper.toVm(entity)).thenReturn(vm);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(entity));
        when(sessionRepository.save(entity)).thenReturn(entity);
        when(simulationMapper.toEventEntity(eq(sessionId), anyString(), any(), anyString(), anyString(), any()))
                .thenReturn(SimulationEvent.builder().id("evt-fl006").sessionId(sessionId).build());
        when(eventRepository.save(any(SimulationEvent.class)))
                .thenReturn(SimulationEvent.builder().id("evt-fl006").sessionId(sessionId).build());

        simulationService.createSession(createVm);
        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-tkof-006", droneId, flightId, "TAKEOFF", 2, "{}", "PENDING", ZonedDateTime.now()));
        for (int i = 0; i < 32; i++) {
            simulationService.stepSessionOnce(sessionId);
        }
        assertThat(entity.getCurrentAlt()).isCloseTo(110.0, org.assertj.core.data.Offset.offset(1.0));

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-alt-120", droneId, flightId, "SET_ALTITUDE", 2, "{\"targetAltitude\": 120}", "PENDING", ZonedDateTime.now()));
        for (int i = 0; i < 6; i++) {
            simulationService.stepSessionOnce(sessionId);
        }
        assertThat(entity.getCurrentAlt()).isCloseTo(120.0, org.assertj.core.data.Offset.offset(0.5));

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-resume-006", droneId, flightId, "RESUME", 2, "{}", "PENDING", ZonedDateTime.now()));
        org.mockito.Mockito.clearInvocations(telemetryClientService);
        for (int i = 0; i < 6; i++) {
            simulationService.stepSessionOnce(sessionId);
        }

        var captor = org.mockito.ArgumentCaptor.forClass(com.utm.simulation.viewmodel.client.TelemetryPushVm.class);
        verify(telemetryClientService, atLeastOnce()).pushTelemetry(captor.capture());
        List<com.utm.simulation.viewmodel.client.TelemetryPushVm> frames = captor.getAllValues();

        assertThat(frames).hasSizeGreaterThanOrEqualTo(6);
        assertThat(frames).allSatisfy(frame -> {
            assertThat(frame.verticalSpeed()).isGreaterThanOrEqualTo(-3.5);
            assertThat(frame.speed()).isGreaterThan(10.0);
        });
        assertThat(frames).anySatisfy(frame -> {
            assertThat(frame.flightMode()).isEqualTo("ALTITUDE_CHANGE");
            assertThat(frame.verticalSpeed()).isEqualTo(-3.5);
        });
        assertThat(frames.getLast().flightMode()).isEqualTo("AUTONOMOUS");
        assertThat(entity.getCurrentAlt()).isCloseTo(110.0, org.assertj.core.data.Offset.offset(0.5));
    }

    @Test
    @DisplayName("Steep nearby GOTO descent caps vertical speed to -3.5 m/s with ALTITUDE_CHANGE mode while real motor_failure retains -8.0 m/s CONTINGENCY")
    void handleDroneCommand_steepGotoAndRealMotorFailure_distinguishControlledDescentFromFailure() {
        String sessionId = "sim-steep-goto";
        String flightId = "flt-steep-goto";
        String droneId = "drn-steep-goto";

        GeoJsonLineStringVm route = new GeoJsonLineStringVm("LineString", List.of(
                List.of(106.7000, 10.7700, 120.0),
                List.of(106.7200, 10.7900, 120.0)));
        FlightDetailVm activeFlight = new FlightDetailVm(
                flightId, "FLT-STEEP-01", droneId, "hub-d1", "hub-tt", 120.0, route, 2,
                Collections.emptyList(), "active");
        SimulationSession entity = SimulationSession.builder()
                .id(sessionId)
                .flightId(flightId)
                .droneId(droneId)
                .status(SimulationStatus.RUNNING)
                .speed(18.0)
                .timeScale(1.0)
                .currentBattery(95.0)
                .build();
        SimulationSessionVm vm = new SimulationSessionVm(
                sessionId, flightId, droneId, SimulationStatus.RUNNING, 18.0, 1.0,
                10.7700, 106.7000, 120.0, 45.0, 95.0, 0.0, 3000.0, 0.0, 0, null,
                ZonedDateTime.now(), ZonedDateTime.now());
        SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(flightId, 18.0, 1.0, 95.0);

        when(flightClientService.getFlightDetail(flightId)).thenReturn(activeFlight);
        when(sessionRepository.existsByDroneIdAndStatusIn(eq(droneId), anyList())).thenReturn(false);
        when(sessionRepository.existsByFlightIdAndStatusIn(eq(flightId), anyList())).thenReturn(false);
        when(simulationMapper.toEntity(createVm)).thenReturn(entity);
        when(sessionRepository.saveAndFlush(entity)).thenReturn(entity);
        when(simulationMapper.toVm(entity)).thenReturn(vm);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(entity));
        when(sessionRepository.save(entity)).thenReturn(entity);
        when(simulationMapper.toEventEntity(eq(sessionId), anyString(), any(), anyString(), anyString(), any()))
                .thenReturn(SimulationEvent.builder().id("evt-steep").sessionId(sessionId).build());
        when(eventRepository.save(any(SimulationEvent.class)))
                .thenReturn(SimulationEvent.builder().id("evt-steep").sessionId(sessionId).build());

        simulationService.createSession(createVm);

        simulationService.handleDroneCommand(new DroneCommandEvent(
                "cmd-goto-steep", droneId, flightId, "GOTO", 2,
                "{\"latitude\": 10.7702, \"longitude\": 106.7000, \"altitude\": 60.0}",
                "PENDING", ZonedDateTime.now()));
        org.mockito.Mockito.clearInvocations(telemetryClientService);
        for (int i = 0; i < 4; i++) {
            simulationService.stepSessionOnce(sessionId);
        }

        var gotoCaptor = org.mockito.ArgumentCaptor.forClass(com.utm.simulation.viewmodel.client.TelemetryPushVm.class);
        verify(telemetryClientService, atLeastOnce()).pushTelemetry(gotoCaptor.capture());
        assertThat(gotoCaptor.getAllValues()).hasSizeGreaterThanOrEqualTo(4);
        assertThat(gotoCaptor.getAllValues()).allSatisfy(frame -> {
            assertThat(frame.verticalSpeed()).isGreaterThanOrEqualTo(-3.5);
            assertThat(frame.flightMode()).isEqualTo("ALTITUDE_CHANGE");
        });

        simulationService.injectScenario(sessionId, new com.utm.simulation.viewmodel.scenario.InjectScenarioVm(
                com.utm.simulation.model.enumeration.EmergencyScenarioType.MOTOR_FAILURE, null));
        org.mockito.Mockito.clearInvocations(telemetryClientService);
        simulationService.stepSessionOnce(sessionId);

        var motorCaptor = org.mockito.ArgumentCaptor.forClass(com.utm.simulation.viewmodel.client.TelemetryPushVm.class);
        verify(telemetryClientService, atLeastOnce()).pushTelemetry(motorCaptor.capture());
        assertThat(motorCaptor.getAllValues()).isNotEmpty();
        assertThat(motorCaptor.getAllValues()).allSatisfy(frame -> {
            assertThat(frame.verticalSpeed()).isEqualTo(-8.0);
            assertThat(frame.flightMode()).isEqualTo("CONTINGENCY");
        });
    }
}
