package com.utm.emergency.service;

import com.utm.emergency.mapper.EmergencyIncidentMapper;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.ResponseAction;
import com.utm.emergency.repository.BlackboxEntryRepository;
import com.utm.emergency.repository.EmergencyIncidentRepository;
import com.utm.emergency.service.client.DroneClientService;
import com.utm.emergency.service.client.FlightClientService;
import com.utm.emergency.service.client.HubClientService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResponseExecutorServiceTest {

    @Mock private EmergencyIncidentRepository incidentRepo;
    @Mock private BlackboxEntryRepository blackboxRepo;
    @Mock private DroneClientService droneClient;
    @Mock private FlightClientService flightClient;
    @Mock private HubClientService hubClient;
    @Mock private EmergencyIncidentMapper incidentMapper;

    @InjectMocks
    private ResponseExecutorServiceImpl responseExecutorService;

    @Test
    void testValidateAction_LandAndHoverAlwaysSafe() {
        EmergencyIncident incident = EmergencyIncident.builder().build();

        var landVal = responseExecutorService.validateAction(incident, ResponseAction.LAND);
        assertTrue(landVal.safe());

        var hoverVal = responseExecutorService.validateAction(incident, ResponseAction.HOVER);
        assertTrue(hoverVal.safe());
    }

    @Test
    void testValidateAction_RTH_InsufficientBattery() {
        EmergencyIncident incident = EmergencyIncident.builder()
                .flightId("flight-1")
                .latitude(37.98)
                .longitude(23.72)
                .detectionData("{\"batteryPercent\": 12.0}")
                .build();

        when(flightClient.getFlightById("flight-1")).thenReturn(Optional.of(
                new FlightClientService.FlightSummaryVm("flight-1", "FL-100", "dr-1", "hub-1", "hub-2", "active")
        ));
        when(hubClient.getHubById("hub-1")).thenReturn(Optional.of(
                new HubClientService.HubLocationVm("hub-1", "ATH", "Athens Hub", 40.64, 22.94, "active")
        ));

        var val = responseExecutorService.validateAction(incident, ResponseAction.RTH);
        assertFalse(val.safe());
        assertEquals(ResponseAction.LAND, val.recommendedAction());
    }
}