package com.utm.emergency.controller;

import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.model.enumeration.ResponseAction;
import com.utm.emergency.service.DecisionEngineService;
import com.utm.emergency.service.EmergencyIncidentService;
import com.utm.emergency.viewmodel.incident.ConfirmIncidentVm;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentVm;
import com.utm.emergency.viewmodel.incident.IncidentPageVm;
import com.utm.emergency.viewmodel.incident.ResolveIncidentVm;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZonedDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmergencyIncidentControllerTest {

    @Mock
    private EmergencyIncidentService incidentService;

    @Mock
    private DecisionEngineService decisionEngine;

    @InjectMocks
    private EmergencyIncidentController incidentController;

    @Test
    void testGetIncidents() {
        when(incidentService.searchIncidents(any(), any(), any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(new IncidentPageVm(List.of(), 0, 50, 0));

        var result = incidentController.getIncidents(null, null, null, null, null, null, 50, 0);
        assertNotNull(result);
        assertEquals(200, result.getStatusCode().value());
        assertEquals(0, result.getBody().total());
    }

    @Test
    void testConfirmIncident() {
        EmergencyIncidentVm vm = new EmergencyIncidentVm(
                "inc-1", "INC-20261107-001", "drone-1", "fl-1", null, EmergencyType.BATTERY_LOW, EmergencySeverity.WARNING,
                IncidentStatus.EXECUTING, "Battery warning", null, 0.0, 0.0, 0.0,
                ResponseAction.RTH, false, true, "pilot", ZonedDateTime.now(), null,
                null, null, true, null, null, null, null,
                null, null, null, List.of(), ZonedDateTime.now(), null, null);

        when(decisionEngine.confirmAction(eq("inc-1"), eq(true), any())).thenReturn(vm);

        var res = incidentController.confirmIncident("inc-1", new ConfirmIncidentVm(true), null);
        assertEquals(200, res.getStatusCode().value());
        assertEquals("inc-1", res.getBody().id());
        assertEquals(IncidentStatus.EXECUTING, res.getBody().status());
    }

    @Test
    void testResolveIncident() {
        EmergencyIncidentVm vm = new EmergencyIncidentVm(
                "inc-1", "INC-20261107-001", "drone-1", "fl-1", null, EmergencyType.BATTERY_LOW, EmergencySeverity.WARNING,
                IncidentStatus.RESOLVED, "Battery warning", null, 0.0, 0.0, 0.0,
                ResponseAction.RTH, false, true, "pilot", ZonedDateTime.now(), null,
                null, null, true, null, ZonedDateTime.now(), "operator", "Landed safely",
                null, null, null, List.of(), ZonedDateTime.now(), null, null);

        when(incidentService.resolveIncident("inc-1", "operator", "Landed safely")).thenReturn(vm);

        var res = incidentController.resolveIncident("inc-1", new ResolveIncidentVm("Landed safely"), null);
        assertEquals(200, res.getStatusCode().value());
        assertEquals(IncidentStatus.RESOLVED, res.getBody().status());
    }
}
