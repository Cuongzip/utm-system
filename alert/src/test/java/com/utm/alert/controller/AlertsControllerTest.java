package com.utm.alert.controller;

import com.utm.alert.model.enumeration.AlertSeverity;
import com.utm.alert.model.enumeration.AlertStatus;
import com.utm.alert.service.AlertService;
import com.utm.alert.viewmodel.AlertAcknowledgePostVm;
import com.utm.alert.viewmodel.AlertListVm;
import com.utm.alert.viewmodel.AlertPostVm;
import com.utm.alert.viewmodel.AlertResolvePostVm;
import com.utm.alert.viewmodel.AlertVm;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlertsControllerTest {

    @Mock
    private AlertService alertService;

    @InjectMocks
    private AlertsController alertsController;

    private AlertVm createSampleAlertVm(String id, String alertType, AlertSeverity severity, AlertStatus status) {
        return new AlertVm(
                id,
                alertType,
                severity.getValue(),
                status.getValue(),
                "drone-123",
                "flight-456",
                "hub-789",
                "Lateral corridor breach test message",
                "{\"crossTrackErrorM\": 18.5}",
                status == AlertStatus.ACKNOWLEDGED || status == AlertStatus.RESOLVED,
                null,
                null,
                status == AlertStatus.RESOLVED,
                null,
                null,
                null,
                ZonedDateTime.now(),
                "SYSTEM_TEST",
                ZonedDateTime.now(),
                null
        );
    }

    @Test
    @DisplayName("GET /api/v1/alerts/active - Should return active alerts list")
    void testGetActiveAlerts() {
        AlertVm alert = createSampleAlertVm("alert-1", "LATERAL_CORRIDOR_BREACH", AlertSeverity.HIGH, AlertStatus.ACTIVE);
        when(alertService.getActiveAlerts()).thenReturn(List.of(alert));

        ResponseEntity<List<AlertVm>> response = alertsController.getActiveAlerts();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        assertEquals("alert-1", response.getBody().get(0).id());
    }

    @Test
    @DisplayName("GET /api/v1/alerts/{id} - Should return alert detail")
    void testGetAlertById() {
        AlertVm alert = createSampleAlertVm("alert-1", "3D_VOLUME_BREACH", AlertSeverity.CRITICAL, AlertStatus.ACTIVE);
        when(alertService.getAlertById("alert-1")).thenReturn(alert);

        ResponseEntity<AlertVm> response = alertsController.getAlertById("alert-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("alert-1", response.getBody().id());
        assertEquals("3D_VOLUME_BREACH", response.getBody().alertType());
    }

    @Test
    @DisplayName("POST /api/v1/alerts - Should create alert and return 201 Created")
    void testCreateAlert() {
        AlertPostVm postVm = new AlertPostVm(
                "LATERAL_CORRIDOR_BREACH",
                "HIGH",
                "flight-456",
                "drone-123",
                "hub-789",
                "Corridor breach detected",
                "{\"crossTrackErrorM\": 16.2}"
        );

        AlertVm created = createSampleAlertVm("alert-new-id", "LATERAL_CORRIDOR_BREACH", AlertSeverity.HIGH, AlertStatus.ACTIVE);
        when(alertService.createAlert(any(AlertPostVm.class))).thenReturn(created);

        ResponseEntity<AlertVm> response = alertsController.createAlert(postVm);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("alert-new-id", response.getBody().id());
        verify(alertService).createAlert(postVm);
    }

    @Test
    @DisplayName("POST /api/v1/alerts/{id}/acknowledge - Should acknowledge alert")
    void testAcknowledgeAlert() {
        AlertAcknowledgePostVm ackVm = new AlertAcknowledgePostVm("Operator acknowledged", "op_alex");
        AlertVm acknowledged = createSampleAlertVm("alert-1", "LATERAL_CORRIDOR_BREACH", AlertSeverity.HIGH, AlertStatus.ACKNOWLEDGED);
        when(alertService.acknowledgeAlert(eq("alert-1"), any())).thenReturn(acknowledged);

        ResponseEntity<AlertVm> response = alertsController.acknowledgeAlert("alert-1", ackVm);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().acknowledged());
        verify(alertService).acknowledgeAlert("alert-1", ackVm);
    }

    @Test
    @DisplayName("POST /api/v1/alerts/{id}/resolve - Should mark alert resolved")
    void testResolveAlert() {
        AlertResolvePostVm resolveVm = new AlertResolvePostVm("Drone restored nominal path", "op_alex");
        AlertVm resolved = createSampleAlertVm("alert-1", "LATERAL_CORRIDOR_BREACH", AlertSeverity.HIGH, AlertStatus.RESOLVED);
        when(alertService.resolveAlert(eq("alert-1"), any())).thenReturn(resolved);

        ResponseEntity<AlertVm> response = alertsController.resolveAlert("alert-1", resolveVm);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().resolved());
        verify(alertService).resolveAlert("alert-1", resolveVm);
    }

    @Test
    @DisplayName("GET /api/v1/alerts - Should query alerts with pagination")
    void testGetAlertsPagination() {
        AlertVm alert = createSampleAlertVm("alert-1", "LATERAL_CORRIDOR_BREACH", AlertSeverity.HIGH, AlertStatus.ACTIVE);
        AlertListVm listVm = new AlertListVm(List.of(alert), 0, 10, 1, 1, true);
        when(alertService.getAlerts(null, "flight-456", null, null, null, null, 0, 10)).thenReturn(listVm);

        ResponseEntity<AlertListVm> response = alertsController.getAlerts(null, "flight-456", null, null, null, null, 0, 10, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().totalElements());
    }
}
