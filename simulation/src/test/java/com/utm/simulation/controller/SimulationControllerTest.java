package com.utm.simulation.controller;

import com.utm.simulation.model.enumeration.EmergencyScenarioType;
import com.utm.simulation.model.enumeration.SimulationStatus;
import com.utm.simulation.service.SimulationService;
import com.utm.simulation.viewmodel.scenario.InjectScenarioResultVm;
import com.utm.simulation.viewmodel.scenario.InjectScenarioVm;
import com.utm.simulation.viewmodel.scenario.ScenarioCatalogVm;
import com.utm.simulation.viewmodel.session.SimulationEventVm;
import com.utm.simulation.viewmodel.session.SimulationSessionCreateVm;
import com.utm.simulation.viewmodel.session.SimulationSessionListVm;
import com.utm.simulation.viewmodel.session.SimulationSessionVm;
import com.utm.simulation.viewmodel.session.TimeScaleUpdateVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: SimulationController")
class SimulationControllerTest {

    private static final String SESSION_ID = "550e8400-e29b-41d4-a716-446655440000";
    private static final String FLIGHT_ID = "f1b2c3d4-e5f6-7890-abcd-ef1234567890";
    private static final String DRONE_ID = "drone-sim-01";

    @Mock
    private SimulationService simulationService;

    @InjectMocks
    private SimulationController controller;

    private SimulationSessionVm sampleSessionVm;

    @BeforeEach
    void setUp() {
        sampleSessionVm = new SimulationSessionVm(
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
                25.0,
                1200.0,
                300.0,
                0,
                null,
                ZonedDateTime.now(),
                ZonedDateTime.now());
    }

    @Test
    @DisplayName("POST /api/v1/simulation/sessions - Should create and launch session, returning 201")
    void createSession_returnsCreatedSession() {
        SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(FLIGHT_ID, 15.0, 1.0, 100.0);
        when(simulationService.createSession(createVm)).thenReturn(sampleSessionVm);

        ResponseEntity<SimulationSessionVm> response = controller.createSession(createVm);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isEqualTo(SESSION_ID);
        verify(simulationService).createSession(createVm);
    }

    @Test
    @DisplayName("GET /api/v1/simulation/sessions - Should return paginated list")
    void getSessions_returnsPaginatedList() {
        SimulationSessionListVm listVm = SimulationSessionListVm.of(List.of(sampleSessionVm), 1);
        when(simulationService.getSessions(eq(SimulationStatus.RUNNING), isNull(), isNull(), isNull(), eq(20), eq(0)))
                .thenReturn(listVm);

        ResponseEntity<SimulationSessionListVm> response = controller.getSessions(SimulationStatus.RUNNING, null, null,
                null, 20, 0);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().items()).hasSize(1);
        assertThat(response.getBody().total()).isEqualTo(1);
    }

    @Test
    @DisplayName("GET /api/v1/simulation/sessions/active - Should return active sessions")
    void getActiveSessions_returnsActiveList() {
        when(simulationService.getActiveSessions()).thenReturn(List.of(sampleSessionVm));

        ResponseEntity<List<SimulationSessionVm>> response = controller.getActiveSessions();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().getFirst().id()).isEqualTo(SESSION_ID);
    }

    @Test
    @DisplayName("GET /api/v1/simulation/sessions/{id} - Should return session details")
    void getSessionById_returnsSessionVm() {
        when(simulationService.getSessionById(SESSION_ID)).thenReturn(sampleSessionVm);

        ResponseEntity<SimulationSessionVm> response = controller.getSessionById(SESSION_ID);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isEqualTo(SESSION_ID);
    }

    @Test
    @DisplayName("GET /api/v1/simulation/sessions/{id}/events - Should return session events")
    void getSessionEvents_returnsEventsList() {
        SimulationEventVm eventVm = new SimulationEventVm(
                "e1", "SCENARIO_INJECTED", "battery_drain", "Battery drain event", "CRITICAL", ZonedDateTime.now());
        when(simulationService.getSessionEvents(SESSION_ID)).thenReturn(List.of(eventVm));

        ResponseEntity<List<SimulationEventVm>> response = controller.getSessionEvents(SESSION_ID);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().getFirst().scenario()).isEqualTo("battery_drain");
    }

    @Test
    @DisplayName("DELETE /api/v1/simulation/sessions/{id} - Should delete session and return 204")
    void deleteSession_returnsNoContent() {
        ResponseEntity<Void> response = controller.deleteSession(SESSION_ID);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(simulationService).deleteSession(SESSION_ID);
    }

    @Test
    @DisplayName("PATCH /api/v1/simulation/sessions/{id}/pause - Should pause session")
    void pauseSession_returnsPausedSession() {
        when(simulationService.pauseSession(SESSION_ID)).thenReturn(sampleSessionVm);

        ResponseEntity<SimulationSessionVm> response = controller.pauseSession(SESSION_ID);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(simulationService).pauseSession(SESSION_ID);
    }

    @Test
    @DisplayName("PATCH /api/v1/simulation/sessions/{id}/resume - Should resume session")
    void resumeSession_returnsResumedSession() {
        when(simulationService.resumeSession(SESSION_ID)).thenReturn(sampleSessionVm);

        ResponseEntity<SimulationSessionVm> response = controller.resumeSession(SESSION_ID);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(simulationService).resumeSession(SESSION_ID);
    }

    @Test
    @DisplayName("PATCH /api/v1/simulation/sessions/{id}/time-scale - Should update time scale")
    void updateTimeScale_returnsUpdatedSession() {
        TimeScaleUpdateVm updateVm = new TimeScaleUpdateVm(5.0);
        when(simulationService.updateTimeScale(SESSION_ID, 5.0)).thenReturn(sampleSessionVm);

        ResponseEntity<SimulationSessionVm> response = controller.updateTimeScale(SESSION_ID, updateVm);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(simulationService).updateTimeScale(SESSION_ID, 5.0);
    }

    @Test
    @DisplayName("POST /api/v1/simulation/sessions/{id}/inject-scenario - Should inject scenario")
    void injectScenario_returnsResult() {
        InjectScenarioVm injectVm = new InjectScenarioVm(EmergencyScenarioType.BATTERY_DRAIN, Map.of());
        SimulationEventVm eventVm = new SimulationEventVm("e1", "SCENARIO_INJECTED", "battery_drain", "Injected",
                "CRITICAL", ZonedDateTime.now());
        InjectScenarioResultVm resultVm = new InjectScenarioResultVm(true, eventVm);
        when(simulationService.injectScenario(SESSION_ID, injectVm)).thenReturn(resultVm);

        ResponseEntity<InjectScenarioResultVm> response = controller.injectScenario(SESSION_ID, injectVm);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().success()).isTrue();
        verify(simulationService).injectScenario(SESSION_ID, injectVm);
    }

    @Test
    @DisplayName("POST /api/v1/simulation/sessions/{id}/stop - Should stop session")
    void stopSession_returnsStoppedSession() {
        when(simulationService.stopSession(SESSION_ID)).thenReturn(sampleSessionVm);

        ResponseEntity<SimulationSessionVm> response = controller.stopSession(SESSION_ID);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(simulationService).stopSession(SESSION_ID);
    }

    @Test
    @DisplayName("GET /api/v1/simulation/scenarios - Should return scenario catalog")
    void getScenarioCatalog_returnsCatalogList() {
        ScenarioCatalogVm catalogItem = new ScenarioCatalogVm("gps_failure", "GPS Failure", "GPS lost", "HIGH",
                List.of("drift"));
        when(simulationService.getScenarioCatalog()).thenReturn(List.of(catalogItem));

        ResponseEntity<List<ScenarioCatalogVm>> response = controller.getScenarioCatalog();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().getFirst().type()).isEqualTo("gps_failure");
    }
}
