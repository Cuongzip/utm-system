package com.utm.simulation.service;

import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.simulation.mapper.SimulationMapper;
import com.utm.simulation.model.SimulationEvent;
import com.utm.simulation.model.SimulationSession;
import com.utm.simulation.model.enumeration.EmergencyScenarioType;
import com.utm.simulation.model.enumeration.SimulationStatus;
import com.utm.simulation.repository.SimulationEventRepository;
import com.utm.simulation.repository.SimulationSessionRepository;
import com.utm.simulation.service.client.FlightClientService;
import com.utm.simulation.service.client.TelemetryClientService;
import com.utm.simulation.viewmodel.client.FlightDetailVm;
import com.utm.simulation.viewmodel.client.GeoJsonLineStringVm;
import com.utm.simulation.viewmodel.client.WaypointVm;
import com.utm.simulation.viewmodel.scenario.InjectScenarioResultVm;
import com.utm.simulation.viewmodel.scenario.InjectScenarioVm;
import com.utm.simulation.viewmodel.scenario.ScenarioCatalogVm;
import com.utm.simulation.viewmodel.session.SimulationEventVm;
import com.utm.simulation.viewmodel.session.SimulationSessionCreateVm;
import com.utm.simulation.viewmodel.session.SimulationSessionListVm;
import com.utm.simulation.viewmodel.session.SimulationSessionVm;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: SimulationServiceImpl (Specification-Driven)")
class SimulationServiceImplTest {

    private static final String SESSION_ID = "550e8400-e29b-41d4-a716-446655440000";
    private static final String FLIGHT_ID = "f1b2c3d4-e5f6-7890-abcd-ef1234567890";
    private static final String DRONE_ID = "drone-sim-01";
    private static final String EVENT_ID = "e1b2c3d4-e5f6-7890-abcd-ef1234567890";

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

    @InjectMocks
    private SimulationServiceImpl simulationService;

    private SimulationSession testSession;
    private SimulationSessionVm testSessionVm;
    private FlightDetailVm testFlight;
    private SimulationEvent testEvent;
    private SimulationEventVm testEventVm;

    @BeforeEach
    void setUp() {
        testSession = SimulationSession.builder()
                .id(SESSION_ID)
                .flightId(FLIGHT_ID)
                .droneId(DRONE_ID)
                .status(SimulationStatus.RUNNING)
                .speed(15.0)
                .timeScale(1.0)
                .currentLat(10.7769)
                .currentLon(106.7009)
                .currentAlt(50.0)
                .currentHeading(45.0)
                .currentBattery(100.0)
                .progress(0.0)
                .totalDistance(1500.0)
                .traveledDistance(0.0)
                .currentSegment(0)
                .build();

        testSessionVm = new SimulationSessionVm(
                SESSION_ID,
                FLIGHT_ID,
                DRONE_ID,
                SimulationStatus.RUNNING,
                15.0,
                1.0,
                10.7769,
                106.7009,
                50.0,
                45.0,
                100.0,
                0.0,
                1500.0,
                0.0,
                0,
                null,
                ZonedDateTime.now(),
                ZonedDateTime.now());

        List<List<Double>> coords = List.of(
                List.of(106.7009, 10.7769, 50.0),
                List.of(106.7050, 10.7800, 60.0),
                List.of(106.7100, 10.7850, 60.0));
        GeoJsonLineStringVm plannedRoute = new GeoJsonLineStringVm("LineString", coords);
        testFlight = new FlightDetailVm(
                FLIGHT_ID,
                "FL-SIM-001",
                DRONE_ID,
                "hub-alpha",
                "hub-bravo",
                50.0,
                plannedRoute,
                3,
                Collections.emptyList());

        testEvent = SimulationEvent.builder()
                .id(EVENT_ID)
                .sessionId(SESSION_ID)
                .eventType("SCENARIO_INJECTED")
                .scenario("battery_drain")
                .message("Injected emergency scenario Critical Battery Drain")
                .severity("CRITICAL")
                .createdOn(ZonedDateTime.now())
                .createdBy("admin")
                .build();

        testEventVm = new SimulationEventVm(
                EVENT_ID,
                "SCENARIO_INJECTED",
                "battery_drain",
                "Injected emergency scenario Critical Battery Drain",
                "CRITICAL",
                ZonedDateTime.now());
    }

    @AfterEach
    void tearDown() {
        simulationService.cleanup();
    }

    @Nested
    @DisplayName("createSession")
    class CreateSession {

        @Test
        @DisplayName("whenFlightIdNullOrBlank_throwsBadRequestException")
        void whenFlightIdNullOrBlank_throwsBadRequestException() {
            SimulationSessionCreateVm invalidVm = new SimulationSessionCreateVm(null, 15.0, 1.0, 100.0);

            assertThatThrownBy(() -> simulationService.createSession(invalidVm))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("whenFlightNotFound_throwsNotFoundException")
        void whenFlightNotFound_throwsNotFoundException() {
            SimulationSessionCreateVm createVm = new SimulationSessionCreateVm("flight-missing", 15.0, 1.0, 100.0);
            when(flightClientService.getFlightDetail("flight-missing")).thenReturn(null);

            assertThatThrownBy(() -> simulationService.createSession(createVm))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("flight-missing");
        }

        @Test
        @DisplayName("whenFlightHasNoDroneId_throwsBadRequestException")
        void whenFlightHasNoDroneId_throwsBadRequestException() {
            FlightDetailVm noDroneFlight = new FlightDetailVm(
                    FLIGHT_ID, "FL-001", null, "hub-1", "hub-2", 50.0, null, 0, Collections.emptyList());
            SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(FLIGHT_ID, 15.0, 1.0, 100.0);
            when(flightClientService.getFlightDetail(FLIGHT_ID)).thenReturn(noDroneFlight);

            assertThatThrownBy(() -> simulationService.createSession(createVm))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("whenDroneAlreadyHasActiveSimulation_throwsDuplicatedException")
        void whenDroneAlreadyHasActiveSimulation_throwsDuplicatedException() {
            SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(FLIGHT_ID, 15.0, 1.0, 100.0);
            when(flightClientService.getFlightDetail(FLIGHT_ID)).thenReturn(testFlight);
            when(sessionRepository.existsByDroneIdAndStatusIn(eq(DRONE_ID), anyList())).thenReturn(true);

            assertThatThrownBy(() -> simulationService.createSession(createVm))
                    .isInstanceOf(DuplicatedException.class)
                    .hasMessageContaining(DRONE_ID);
        }

        @Test
        @DisplayName("whenFlightAlreadyHasActiveSimulation_throwsDuplicatedException")
        void whenFlightAlreadyHasActiveSimulation_throwsDuplicatedException() {
            SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(FLIGHT_ID, 15.0, 1.0, 100.0);
            when(flightClientService.getFlightDetail(FLIGHT_ID)).thenReturn(testFlight);
            when(sessionRepository.existsByDroneIdAndStatusIn(eq(DRONE_ID), anyList())).thenReturn(false);
            when(sessionRepository.existsByFlightIdAndStatusIn(eq(FLIGHT_ID), anyList())).thenReturn(true);

            assertThatThrownBy(() -> simulationService.createSession(createVm))
                    .isInstanceOf(DuplicatedException.class)
                    .hasMessageContaining(FLIGHT_ID);
        }

        @Test
        @DisplayName("whenFlightRouteHasInsufficientWaypoints_throwsBadRequestException")
        void whenFlightRouteHasInsufficientWaypoints_throwsBadRequestException() {
            GeoJsonLineStringVm singlePointRoute = new GeoJsonLineStringVm("LineString",
                    List.of(List.of(106.7009, 10.7769, 50.0)));
            FlightDetailVm badRouteFlight = new FlightDetailVm(
                    FLIGHT_ID, "FL-001", DRONE_ID, "hub-1", "hub-2", 50.0, singlePointRoute, 1,
                    Collections.emptyList());
            SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(FLIGHT_ID, 15.0, 1.0, 100.0);
            when(flightClientService.getFlightDetail(FLIGHT_ID)).thenReturn(badRouteFlight);
            when(sessionRepository.existsByDroneIdAndStatusIn(eq(DRONE_ID), anyList())).thenReturn(false);
            when(sessionRepository.existsByFlightIdAndStatusIn(eq(FLIGHT_ID), anyList())).thenReturn(false);

            assertThatThrownBy(() -> simulationService.createSession(createVm))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("whenRouteDistanceUnderTenMeters_throwsBadRequestException")
        void whenRouteDistanceUnderTenMeters_throwsBadRequestException() {
            GeoJsonLineStringVm microRoute = new GeoJsonLineStringVm("LineString", List.of(
                    List.of(106.7009000, 10.7769000, 50.0),
                    List.of(106.7009001, 10.7769001, 50.0)));
            FlightDetailVm shortFlight = new FlightDetailVm(
                    FLIGHT_ID, "FL-001", DRONE_ID, "hub-1", "hub-2", 50.0, microRoute, 2, Collections.emptyList());
            SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(FLIGHT_ID, 15.0, 1.0, 100.0);
            when(flightClientService.getFlightDetail(FLIGHT_ID)).thenReturn(shortFlight);
            when(sessionRepository.existsByDroneIdAndStatusIn(eq(DRONE_ID), anyList())).thenReturn(false);
            when(sessionRepository.existsByFlightIdAndStatusIn(eq(FLIGHT_ID), anyList())).thenReturn(false);

            assertThatThrownBy(() -> simulationService.createSession(createVm))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("whenValidWithGeoJsonPlannedRoute_createsSessionAndStartsRuntime")
        void whenValidWithGeoJsonPlannedRoute_createsSessionAndStartsRuntime() {
            SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(FLIGHT_ID, 15.0, 2.0, 95.0);

            when(flightClientService.getFlightDetail(FLIGHT_ID)).thenReturn(testFlight);
            when(sessionRepository.existsByDroneIdAndStatusIn(eq(DRONE_ID), anyList())).thenReturn(false);
            when(sessionRepository.existsByFlightIdAndStatusIn(eq(FLIGHT_ID), anyList())).thenReturn(false);
            when(simulationMapper.toEntity(createVm)).thenReturn(testSession);
            when(sessionRepository.saveAndFlush(testSession)).thenReturn(testSession);
            when(simulationMapper.toVm(testSession)).thenReturn(testSessionVm);

            SimulationSessionVm result = simulationService.createSession(createVm);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo(SESSION_ID);
            assertThat(result.flightId()).isEqualTo(FLIGHT_ID);
            assertThat(result.droneId()).isEqualTo(DRONE_ID);
            assertThat(result.status()).isEqualTo(SimulationStatus.RUNNING);
            verify(sessionRepository).saveAndFlush(testSession);
        }

        @Test
        @DisplayName("whenValidWithWaypointsList_createsSessionAndStartsRuntime")
        void whenValidWithWaypointsList_createsSessionAndStartsRuntime() {
            List<WaypointVm> waypointsList = List.of(
                    new WaypointVm(10.7769, 106.7009, 50.0),
                    new WaypointVm(10.7850, 106.7100, 60.0));
            FlightDetailVm waypointsFlight = new FlightDetailVm(
                    FLIGHT_ID, "FL-002", DRONE_ID, "hub-1", "hub-2", 50.0, null, 2, waypointsList);
            SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(FLIGHT_ID, 12.0, 1.0, 100.0);

            when(flightClientService.getFlightDetail(FLIGHT_ID)).thenReturn(waypointsFlight);
            when(sessionRepository.existsByDroneIdAndStatusIn(eq(DRONE_ID), anyList())).thenReturn(false);
            when(sessionRepository.existsByFlightIdAndStatusIn(eq(FLIGHT_ID), anyList())).thenReturn(false);
            when(simulationMapper.toEntity(createVm)).thenReturn(testSession);
            when(sessionRepository.saveAndFlush(testSession)).thenReturn(testSession);
            when(simulationMapper.toVm(testSession)).thenReturn(testSessionVm);

            SimulationSessionVm result = simulationService.createSession(createVm);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo(SESSION_ID);
            verify(sessionRepository).saveAndFlush(testSession);
        }
    }

    @Nested
    @DisplayName("getSessions")
    class GetSessions {

        @Test
        @DisplayName("whenLimitZeroOrNegative_queriesUnpagedAndReturnsList")
        void whenLimitZeroOrNegative_queriesUnpagedAndReturnsList() {
            when(sessionRepository.findAll(ArgumentMatchers.<Specification<SimulationSession>>any(), any(Sort.class)))
                    .thenReturn(List.of(testSession));
            when(simulationMapper.toVm(testSession)).thenReturn(testSessionVm);

            SimulationSessionListVm result = simulationService.getSessions(null, null, null, null, 0, 0);

            assertThat(result).isNotNull();
            assertThat(result.items()).hasSize(1);
            assertThat(result.total()).isEqualTo(1);
            verify(sessionRepository).findAll(ArgumentMatchers.<Specification<SimulationSession>>any(),
                    any(Sort.class));
        }

        @Test
        @DisplayName("whenLimitPositive_queriesPagedWithSpecification")
        void whenLimitPositive_queriesPagedWithSpecification() {
            Page<SimulationSession> page = new PageImpl<>(List.of(testSession), Pageable.ofSize(10), 1);
            when(sessionRepository.findAll(ArgumentMatchers.<Specification<SimulationSession>>any(),
                    any(Pageable.class)))
                    .thenReturn(page);
            when(simulationMapper.toVm(testSession)).thenReturn(testSessionVm);

            SimulationSessionListVm result = simulationService.getSessions(
                    SimulationStatus.RUNNING, DRONE_ID, FLIGHT_ID, "test-search", 10, 0);

            assertThat(result).isNotNull();
            assertThat(result.items()).hasSize(1);
            assertThat(result.total()).isEqualTo(1);
            verify(sessionRepository).findAll(ArgumentMatchers.<Specification<SimulationSession>>any(),
                    any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("getAllSessions & getActiveSessions")
    class GetActiveAndAllSessions {

        @Test
        @DisplayName("getAllSessions_returnsAllSessionsAsList")
        void getAllSessions_returnsAllSessionsAsList() {
            when(sessionRepository.findAll(ArgumentMatchers.<Specification<SimulationSession>>any(), any(Sort.class)))
                    .thenReturn(List.of(testSession));
            when(simulationMapper.toVm(testSession)).thenReturn(testSessionVm);

            List<SimulationSessionVm> result = simulationService.getAllSessions();

            assertThat(result).hasSize(1);
            assertThat(result.getFirst().id()).isEqualTo(SESSION_ID);
        }

        @Test
        @DisplayName("getActiveSessions_returnsRunningAndPausedSessionsOrdered")
        void getActiveSessions_returnsRunningAndPausedSessionsOrdered() {
            when(sessionRepository.findByStatusInOrderByCreatedOnDesc(anyList()))
                    .thenReturn(List.of(testSession));
            when(simulationMapper.toVm(testSession)).thenReturn(testSessionVm);

            List<SimulationSessionVm> result = simulationService.getActiveSessions();

            assertThat(result).hasSize(1);
            assertThat(result.getFirst().status()).isEqualTo(SimulationStatus.RUNNING);
            verify(sessionRepository).findByStatusInOrderByCreatedOnDesc(anyList());
        }
    }

    @Nested
    @DisplayName("getSessionById")
    class GetSessionById {

        @Test
        @DisplayName("whenFound_returnsMappedVm")
        void whenFound_returnsMappedVm() {
            when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(testSession));
            when(simulationMapper.toVm(testSession)).thenReturn(testSessionVm);

            SimulationSessionVm result = simulationService.getSessionById(SESSION_ID);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo(SESSION_ID);
            assertThat(result.droneId()).isEqualTo(DRONE_ID);
        }

        @Test
        @DisplayName("whenNotFound_throwsNotFoundException")
        void whenNotFound_throwsNotFoundException() {
            when(sessionRepository.findById("unknown-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> simulationService.getSessionById("unknown-id"))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("unknown-id");
        }
    }

    @Nested
    @DisplayName("deleteSession")
    class DeleteSession {

        @Test
        @DisplayName("whenFound_cancelsRuntimeDeletesEventsAndDeletesSession")
        void whenFound_cancelsRuntimeDeletesEventsAndDeletesSession() {
            when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(testSession));
            when(eventRepository.findBySessionIdOrderByCreatedOnAsc(SESSION_ID)).thenReturn(List.of(testEvent));

            simulationService.deleteSession(SESSION_ID);

            verify(eventRepository).deleteAll(List.of(testEvent));
            verify(sessionRepository).delete(testSession);
        }

        @Test
        @DisplayName("whenNotFound_throwsNotFoundException")
        void whenNotFound_throwsNotFoundException() {
            when(sessionRepository.findById("unknown-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> simulationService.deleteSession("unknown-id"))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("unknown-id");

            verify(sessionRepository, never()).delete(any(SimulationSession.class));
        }
    }

    @Nested
    @DisplayName("pauseSession")
    class PauseSession {

        @Test
        @DisplayName("whenRunning_pausesSessionAndRecordsEvent")
        void whenRunning_pausesSessionAndRecordsEvent() {
            testSession.setStatus(SimulationStatus.RUNNING);
            when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(testSession));
            when(sessionRepository.save(testSession)).thenReturn(testSession);
            when(simulationMapper.toEventEntity(eq(SESSION_ID), eq("SESSION_PAUSED"), isNull(), anyString(), eq("LOW"),
                    isNull()))
                    .thenReturn(testEvent);
            when(eventRepository.save(testEvent)).thenReturn(testEvent);

            SimulationSessionVm pausedVm = new SimulationSessionVm(
                    SESSION_ID, FLIGHT_ID, DRONE_ID, SimulationStatus.PAUSED,
                    15.0, 1.0, 10.7769, 106.7009, 50.0, 45.0, 100.0, 0.0, 1500.0, 0.0, 0, null,
                    ZonedDateTime.now(), ZonedDateTime.now());
            when(simulationMapper.toVm(testSession)).thenReturn(pausedVm);

            SimulationSessionVm result = simulationService.pauseSession(SESSION_ID);

            assertThat(result).isNotNull();
            assertThat(result.status()).isEqualTo(SimulationStatus.PAUSED);
            assertThat(testSession.getStatus()).isEqualTo(SimulationStatus.PAUSED);
            verify(sessionRepository).save(testSession);
            verify(eventRepository).save(testEvent);
        }

        @Test
        @DisplayName("whenAlreadyPaused_throwsBadRequestException")
        void whenAlreadyPaused_throwsBadRequestException() {
            testSession.setStatus(SimulationStatus.PAUSED);
            when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(testSession));

            assertThatThrownBy(() -> simulationService.pauseSession(SESSION_ID))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("already paused");

            verify(sessionRepository, never()).save(any());
        }

        @Test
        @DisplayName("whenStoppedOrCompleted_throwsBadRequestException")
        void whenStoppedOrCompleted_throwsBadRequestException() {
            testSession.setStatus(SimulationStatus.STOPPED);
            when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(testSession));

            assertThatThrownBy(() -> simulationService.pauseSession(SESSION_ID))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Cannot pause a stopped");

            verify(sessionRepository, never()).save(any());
        }

        @Test
        @DisplayName("whenNotFound_throwsNotFoundException")
        void whenNotFound_throwsNotFoundException() {
            when(sessionRepository.findById("unknown-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> simulationService.pauseSession("unknown-id"))
                    .isInstanceOf(NotFoundException.class);
        }
    }

    @Nested
    @DisplayName("resumeSession")
    class ResumeSession {

        @Test
        @DisplayName("whenNotPaused_throwsBadRequestException")
        void whenNotPaused_throwsBadRequestException() {
            testSession.setStatus(SimulationStatus.RUNNING);
            when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(testSession));

            assertThatThrownBy(() -> simulationService.resumeSession(SESSION_ID))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("already running");
        }

        @Test
        @DisplayName("whenStopped_throwsBadRequestException")
        void whenStopped_throwsBadRequestException() {
            testSession.setStatus(SimulationStatus.STOPPED);
            when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(testSession));

            assertThatThrownBy(() -> simulationService.resumeSession(SESSION_ID))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Cannot resume a stopped");
        }

        @Test
        @DisplayName("whenPausedButRuntimeMissing_throwsBadRequestException")
        void whenPausedButRuntimeMissing_throwsBadRequestException() {
            testSession.setStatus(SimulationStatus.PAUSED);
            when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(testSession));

            assertThatThrownBy(() -> simulationService.resumeSession(SESSION_ID))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("No active in-memory runtime found");
        }

        @Test
        @DisplayName("whenPausedAndRuntimeExists_resumesSessionAndRecordsEvent")
        void whenPausedAndRuntimeExists_resumesSessionAndRecordsEvent() {
            SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(FLIGHT_ID, 15.0, 1.0, 100.0);
            when(flightClientService.getFlightDetail(FLIGHT_ID)).thenReturn(testFlight);
            when(sessionRepository.existsByDroneIdAndStatusIn(eq(DRONE_ID), anyList())).thenReturn(false);
            when(sessionRepository.existsByFlightIdAndStatusIn(eq(FLIGHT_ID), anyList())).thenReturn(false);
            when(simulationMapper.toEntity(createVm)).thenReturn(testSession);
            when(sessionRepository.saveAndFlush(testSession)).thenReturn(testSession);
            when(simulationMapper.toVm(testSession)).thenReturn(testSessionVm);

            simulationService.createSession(createVm);

            testSession.setStatus(SimulationStatus.PAUSED);
            when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(testSession));
            when(sessionRepository.save(testSession)).thenReturn(testSession);
            when(simulationMapper.toEventEntity(eq(SESSION_ID), eq("SESSION_RESUMED"), isNull(), anyString(), eq("LOW"),
                    isNull()))
                    .thenReturn(testEvent);
            when(eventRepository.save(testEvent)).thenReturn(testEvent);

            SimulationSessionVm resumedVm = new SimulationSessionVm(
                    SESSION_ID, FLIGHT_ID, DRONE_ID, SimulationStatus.RUNNING,
                    15.0, 1.0, 10.7769, 106.7009, 50.0, 45.0, 100.0, 0.0, 1500.0, 0.0, 0, null,
                    ZonedDateTime.now(), ZonedDateTime.now());
            when(simulationMapper.toVm(testSession)).thenReturn(resumedVm);

            SimulationSessionVm result = simulationService.resumeSession(SESSION_ID);

            assertThat(result).isNotNull();
            assertThat(result.status()).isEqualTo(SimulationStatus.RUNNING);
            assertThat(testSession.getStatus()).isEqualTo(SimulationStatus.RUNNING);
            verify(sessionRepository).save(testSession);
            verify(eventRepository).save(testEvent);
        }

        @Test
        @DisplayName("whenNotFound_throwsNotFoundException")
        void whenNotFound_throwsNotFoundException() {
            when(sessionRepository.findById("unknown-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> simulationService.resumeSession("unknown-id"))
                    .isInstanceOf(NotFoundException.class);
        }
    }

    @Nested
    @DisplayName("updateTimeScale")
    class UpdateTimeScale {

        @Test
        @DisplayName("whenRunningOrPaused_updatesTimeScaleAndRecordsEvent")
        void whenRunningOrPaused_updatesTimeScaleAndRecordsEvent() {
            testSession.setStatus(SimulationStatus.RUNNING);
            when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(testSession));
            when(sessionRepository.save(testSession)).thenReturn(testSession);
            when(simulationMapper.toEventEntity(eq(SESSION_ID), eq("TIME_SCALE_CHANGED"), isNull(), anyString(),
                    eq("LOW"), isNull()))
                    .thenReturn(testEvent);
            when(eventRepository.save(testEvent)).thenReturn(testEvent);

            SimulationSessionVm updatedVm = new SimulationSessionVm(
                    SESSION_ID, FLIGHT_ID, DRONE_ID, SimulationStatus.RUNNING,
                    15.0, 5.0, 10.7769, 106.7009, 50.0, 45.0, 100.0, 0.0, 1500.0, 0.0, 0, null,
                    ZonedDateTime.now(), ZonedDateTime.now());
            when(simulationMapper.toVm(testSession)).thenReturn(updatedVm);

            SimulationSessionVm result = simulationService.updateTimeScale(SESSION_ID, 5.0);

            assertThat(result).isNotNull();
            assertThat(result.timeScale()).isEqualTo(5.0);
            assertThat(testSession.getTimeScale()).isEqualTo(5.0);
            verify(sessionRepository).save(testSession);
            verify(eventRepository).save(testEvent);
        }

        @Test
        @DisplayName("whenStoppedOrCompleted_throwsBadRequestException")
        void whenStoppedOrCompleted_throwsBadRequestException() {
            testSession.setStatus(SimulationStatus.STOPPED);
            when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(testSession));

            assertThatThrownBy(() -> simulationService.updateTimeScale(SESSION_ID, 2.0))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Cannot update time scale on a stopped");
        }

        @Test
        @DisplayName("whenNotFound_throwsNotFoundException")
        void whenNotFound_throwsNotFoundException() {
            when(sessionRepository.findById("unknown-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> simulationService.updateTimeScale("unknown-id", 2.0))
                    .isInstanceOf(NotFoundException.class);
        }
    }

    @Nested
    @DisplayName("injectScenario")
    class InjectScenario {

        @Test
        @DisplayName("whenRunning_injectsScenarioAndRecordsEvent")
        void whenRunning_injectsScenarioAndRecordsEvent() {
            testSession.setStatus(SimulationStatus.RUNNING);
            InjectScenarioVm injectVm = new InjectScenarioVm(EmergencyScenarioType.BATTERY_DRAIN,
                    Map.of("dischargeRate", 5.0));

            when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(testSession));
            when(sessionRepository.save(testSession)).thenReturn(testSession);
            when(simulationMapper.toEventEntity(eq(SESSION_ID), eq("SCENARIO_INJECTED"), eq("battery_drain"),
                    anyString(), eq("CRITICAL"), isNull()))
                    .thenReturn(testEvent);
            when(eventRepository.save(testEvent)).thenReturn(testEvent);
            when(simulationMapper.toVm(testEvent)).thenReturn(testEventVm);

            InjectScenarioResultVm result = simulationService.injectScenario(SESSION_ID, injectVm);

            assertThat(result).isNotNull();
            assertThat(result.success()).isTrue();
            assertThat(result.event().scenario()).isEqualTo("battery_drain");
            assertThat(testSession.getActiveScenario()).isEqualTo("battery_drain");
            verify(sessionRepository).save(testSession);
            verify(eventRepository).save(testEvent);
        }

        @Test
        @DisplayName("whenStoppedOrCompleted_throwsBadRequestException")
        void whenStoppedOrCompleted_throwsBadRequestException() {
            testSession.setStatus(SimulationStatus.COMPLETED);
            InjectScenarioVm injectVm = new InjectScenarioVm(EmergencyScenarioType.GPS_FAILURE, Map.of());

            when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(testSession));

            assertThatThrownBy(() -> simulationService.injectScenario(SESSION_ID, injectVm))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Cannot inject scenario into a completed");
        }

        @Test
        @DisplayName("whenNotFound_throwsNotFoundException")
        void whenNotFound_throwsNotFoundException() {
            InjectScenarioVm injectVm = new InjectScenarioVm(EmergencyScenarioType.GPS_FAILURE, Map.of());
            when(sessionRepository.findById("unknown-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> simulationService.injectScenario("unknown-id", injectVm))
                    .isInstanceOf(NotFoundException.class);
        }
    }

    @Nested
    @DisplayName("stopSession")
    class StopSession {

        @Test
        @DisplayName("whenRunning_stopsSessionAndCancelsRuntime")
        void whenRunning_stopsSessionAndCancelsRuntime() {
            testSession.setStatus(SimulationStatus.RUNNING);
            when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(testSession));
            when(sessionRepository.save(testSession)).thenReturn(testSession);
            when(simulationMapper.toEventEntity(eq(SESSION_ID), eq("SESSION_STOPPED"), isNull(), anyString(), eq("LOW"), isNull()))
                    .thenReturn(testEvent);
            when(eventRepository.save(testEvent)).thenReturn(testEvent);

            SimulationSessionVm stoppedVm = new SimulationSessionVm(
                    SESSION_ID, FLIGHT_ID, DRONE_ID, SimulationStatus.STOPPED,
                    15.0, 1.0, 10.7769, 106.7009, 50.0, 45.0, 100.0, 0.0, 1500.0, 0.0, 0, null,
                    ZonedDateTime.now(), ZonedDateTime.now()
            );
            when(simulationMapper.toVm(testSession)).thenReturn(stoppedVm);

            SimulationSessionVm result = simulationService.stopSession(SESSION_ID);

            assertThat(result).isNotNull();
            assertThat(result.status()).isEqualTo(SimulationStatus.STOPPED);
            assertThat(testSession.getStatus()).isEqualTo(SimulationStatus.STOPPED);
            verify(sessionRepository).save(testSession);
            verify(eventRepository).save(testEvent);
        }

        @Test
        @DisplayName("whenAlreadyStopped_throwsBadRequestException")
        void whenAlreadyStopped_throwsBadRequestException() {
            testSession.setStatus(SimulationStatus.STOPPED);
            when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(testSession));

            assertThatThrownBy(() -> simulationService.stopSession(SESSION_ID))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("already stopped");
        }

        @Test
        @DisplayName("whenAlreadyCompleted_throwsBadRequestException")
        void whenAlreadyCompleted_throwsBadRequestException() {
            testSession.setStatus(SimulationStatus.COMPLETED);
            when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(testSession));

            assertThatThrownBy(() -> simulationService.stopSession(SESSION_ID))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Cannot stop an already completed");
        }

        @Test
        @DisplayName("whenNotFound_throwsNotFoundException")
        void whenNotFound_throwsNotFoundException() {
            when(sessionRepository.findById("unknown-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> simulationService.stopSession("unknown-id"))
                    .isInstanceOf(NotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getScenarioCatalog")
    class GetScenarioCatalog {

        @Test
        @DisplayName("whenCalled_returnsAllEmergencyScenariosWithParameters")
        void whenCalled_returnsAllEmergencyScenariosWithParameters() {
            List<ScenarioCatalogVm> catalog = simulationService.getScenarioCatalog();

            assertThat(catalog).hasSize(EmergencyScenarioType.values().length);
            assertThat(catalog).extracting(ScenarioCatalogVm::type)
                    .contains("gps_failure", "battery_drain", "c2_lost", "motor_failure", "geofence_breach");
            assertThat(catalog.getFirst().parameters()).isNotEmpty();
        }
    }

    @Nested
    @DisplayName("getSessionEvents")
    class GetSessionEvents {

        @Test
        @DisplayName("whenCalled_returnsOrderedSessionEvents")
        void whenCalled_returnsOrderedSessionEvents() {
            when(eventRepository.findBySessionIdOrderByCreatedOnAsc(SESSION_ID)).thenReturn(List.of(testEvent));
            when(simulationMapper.toVm(testEvent)).thenReturn(testEventVm);

            List<SimulationEventVm> events = simulationService.getSessionEvents(SESSION_ID);

            assertThat(events).hasSize(1);
            assertThat(events.getFirst().id()).isEqualTo(EVENT_ID);
            assertThat(events.getFirst().scenario()).isEqualTo("battery_drain");
            verify(eventRepository).findBySessionIdOrderByCreatedOnAsc(SESSION_ID);
        }
    }
}
