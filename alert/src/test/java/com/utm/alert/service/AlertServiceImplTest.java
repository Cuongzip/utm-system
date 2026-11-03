package com.utm.alert.service;

import com.utm.alert.mapper.AlertMapper;
import com.utm.alert.model.Alert;
import com.utm.alert.model.enumeration.AlertSeverity;
import com.utm.alert.model.enumeration.AlertStatus;
import com.utm.alert.repository.AlertRepository;
import com.utm.alert.viewmodel.AlertAcknowledgePostVm;
import com.utm.alert.viewmodel.AlertPostVm;
import com.utm.alert.viewmodel.AlertResolvePostVm;
import com.utm.alert.viewmodel.AlertVm;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.ZonedDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlertServiceImplTest {

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private AlertMapper alertMapper;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private AlertServiceImpl alertService;

    @Test
    void testCreateAlertBroadcastsWebSocket() {
        AlertPostVm postVm = new AlertPostVm("battery_low", "CRITICAL", "fl-1", "drone-1", null, "Battery critical", "{}");
        Alert alert = new Alert();
        alert.setDroneId("drone-1");
        alert.setFlightId("fl-1");
        alert.setSeverity(AlertSeverity.CRITICAL);

        AlertVm vm = new AlertVm(
                "alert-1", "battery_low", AlertSeverity.CRITICAL, AlertStatus.ACTIVE,
                "drone-1", "fl-1", null, "Battery critical", "{}",
                false, null, null, false, null, null, null,
                ZonedDateTime.now(), "system", ZonedDateTime.now(), "system"
        );

        when(alertMapper.toEntity(postVm)).thenReturn(alert);
        when(alertRepository.save(any(Alert.class))).thenReturn(alert);
        when(alertMapper.toVm(alert)).thenReturn(vm);

        AlertVm result = alertService.createAlert(postVm);
        assertNotNull(result);

        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/live"), eq(vm));
        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/critical"), eq(vm));
        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/drone/drone-1"), eq(vm));
        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/flight/fl-1"), eq(vm));
    }

    @Test
    void testAcknowledgeAlertBroadcastsWebSocket() {
        Alert alert = new Alert();
        alert.setId("alert-1");
        alert.setDroneId("drone-1");
        alert.setFlightId("fl-1");
        alert.setSeverity(AlertSeverity.HIGH);
        alert.setStatus(AlertStatus.ACTIVE);

        AlertVm vm = new AlertVm(
                "alert-1", "battery_low", AlertSeverity.HIGH, AlertStatus.ACKNOWLEDGED,
                "drone-1", "fl-1", null, "Ack message", null,
                true, ZonedDateTime.now(), "operator", false, null, null, null,
                ZonedDateTime.now(), "system", ZonedDateTime.now(), "operator"
        );

        when(alertRepository.findById("alert-1")).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(Alert.class))).thenReturn(alert);
        when(alertMapper.toVm(alert)).thenReturn(vm);

        AlertVm result = alertService.acknowledgeAlert("alert-1", new AlertAcknowledgePostVm("operator", "note"));
        assertNotNull(result);

        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/live"), eq(vm));
    }

    @Test
    void testResolveAlertBroadcastsWebSocket() {
        Alert alert = new Alert();
        alert.setId("alert-1");
        alert.setDroneId("drone-1");
        alert.setFlightId("fl-1");
        alert.setSeverity(AlertSeverity.HIGH);
        alert.setStatus(AlertStatus.ACKNOWLEDGED);

        AlertVm vm = new AlertVm(
                "alert-1", "battery_low", AlertSeverity.HIGH, AlertStatus.RESOLVED,
                "drone-1", "fl-1", null, "Resolve message", null,
                true, ZonedDateTime.now(), "operator", true, ZonedDateTime.now(), "operator", null,
                ZonedDateTime.now(), "system", ZonedDateTime.now(), "operator"
        );

        when(alertRepository.findById("alert-1")).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(Alert.class))).thenReturn(alert);
        when(alertMapper.toVm(alert)).thenReturn(vm);

        AlertVm result = alertService.resolveAlert("alert-1", new AlertResolvePostVm("operator", "resolved note"));
        assertNotNull(result);

        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/live"), eq(vm));
    }
}
