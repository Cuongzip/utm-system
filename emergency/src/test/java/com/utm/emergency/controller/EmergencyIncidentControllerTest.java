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

        IncidentPageVm result = incidentController.getIncidents(null, null, null, null, null, null, 50, 0);
        assertNotNull(result);
        assertEquals(0, result.total());
    }

    @Test
    void testConfirmIncident() {
        EmergencyIncidentVm vm = new EmergencyIncidentVm(
                "inc-1", "drone-1", "fl-1", EmergencyType.battery_low, EmergencySeverity.warning,
                IncidentStatus.resolved, "Battery warning", null, 0.0, 0.0, 0.0,
                ResponseAction.RTH, false, true, "pilot", ZonedDateTime.now(), null,
                null, null, true, null, ZonedDateTime.now(), "pilot", "RTH confirmed",
                null, null, null, List.of(), ZonedDateTime.now(), null, null
        );

        when(decisionEngine.confirmAction(eq("inc-1"), eq(true), any())).thenReturn(vm);

        EmergencyIncidentVm res = incidentController.confirmIncident("inc-1", new ConfirmIncidentVm(true), null);
        assertEquals("inc-1", res.id());
        assertEquals(IncidentStatus.resolved, res.status());
    }
}

