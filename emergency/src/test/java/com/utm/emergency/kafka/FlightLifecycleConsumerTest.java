package com.utm.emergency.kafka;

import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.emergency.mapper.EmergencyIncidentMapper;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.repository.EmergencyIncidentRepository;
import com.utm.emergency.service.DecisionEngineService;
import com.utm.emergency.service.EmergencyIncidentServiceImpl;
import com.utm.emergency.service.client.AlertClientService;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentVm;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: FlightLifecycleConsumer (Auto-resolve & Timer Cancellation)")
class FlightLifecycleConsumerTest {

    @Mock
    private EmergencyIncidentRepository incidentRepository;

    @Mock
    private EmergencyIncidentMapper incidentMapper;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private DecisionEngineService decisionEngine;

    @Mock
    private AlertClientService alertClient;

    @InjectMocks
    private FlightLifecycleConsumer consumer;

    @Test
    @DisplayName("onFlightEventReceived cancels pending confirmation timer, resolves open incident, and clears linked alerts")
    void onFlightEventReceived_whenFlightCompleted_cancelsTimerAndResolvesIncidentAndAlerts() {
        EmergencyIncident incident = EmergencyIncident.builder()
                .id("inc-pending-1")
                .droneId("drone-1")
                .flightId("flight-1")
                .emergencyType(EmergencyType.BATTERY_LOW)
                .severity(EmergencySeverity.WARNING)
                .status(IncidentStatus.PENDING_CONFIRMATION)
                .detectedAt(ZonedDateTime.now())
                .build();

        EmergencyIncidentVm vm = mock(EmergencyIncidentVm.class);
        when(vm.droneId()).thenReturn("drone-1");
        when(vm.flightId()).thenReturn("flight-1");

        when(incidentRepository.findByFlightIdAndStatusIn("flight-1", EmergencyIncidentServiceImpl.OPEN_STATUSES))
                .thenReturn(List.of(incident));
        when(incidentRepository.save(incident)).thenReturn(incident);
        when(incidentMapper.toVm(incident)).thenReturn(vm);

        FlightLifecycleEvent event = new FlightLifecycleEvent(
                FlightLifecycleEvent.FLIGHT_COMPLETED,
                "flight-1", "FL-001", null, null, null, null,
                "drone-1", "hub-1", "hub-2", "hub-2", "completed",
                null, 0.5, null, ZonedDateTime.now());

        consumer.onFlightEventReceived("flight-1", event);

        assertThat(incident.getStatus()).isEqualTo(IncidentStatus.RESOLVED);
        assertThat(incident.getResolvedBy()).isEqualTo("system");
        assertThat(incident.getResolutionNotes()).contains("FLIGHT_COMPLETED");
        verify(decisionEngine).cancelPendingConfirmation("inc-pending-1");
        verify(alertClient).resolveAlertsByIncident(eq("inc-pending-1"), anyString());
        verify(messagingTemplate).convertAndSend("/topic/emergency/incidents", vm);
    }
}
