package com.utm.emergency.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.emergency.mapper.BlackboxEntryMapper;
import com.utm.emergency.mapper.EmergencyIncidentMapper;
import com.utm.emergency.model.BlackboxEntry;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.model.enumeration.ResponseAction;
import com.utm.emergency.repository.BlackboxEntryRepository;
import com.utm.emergency.repository.EmergencyIncidentRepository;
import com.utm.emergency.service.client.DroneClientService;
import com.utm.emergency.service.client.FlightClientService;
import com.utm.emergency.service.client.HubClientService;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentVm;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: ResponseExecutorServiceImpl (Specification-Driven)")
class ResponseExecutorServiceTest {

        @Mock
        private EmergencyIncidentRepository incidentRepo;

        @Mock
        private BlackboxEntryRepository blackboxRepo;

        @Mock
        private DroneClientService droneClient;

        @Mock
        private FlightClientService flightClient;

        @Mock
        private HubClientService hubClient;

        @Mock
        private EmergencyIncidentMapper incidentMapper;

        @Mock
        private BlackboxEntryMapper blackboxMapper;

        @Mock
        private SimpMessagingTemplate messagingTemplate;

        @InjectMocks
        private ResponseExecutorServiceImpl responseExecutorService;

        @Captor
        private ArgumentCaptor<EmergencyIncident> incidentCaptor;

        private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

        @Nested
        @DisplayName("validateAction Tests")
        class ValidateActionTests {

                @Test
                @DisplayName("validateAction returns safe for standard vertical and hover maneuvers")
                void validateAction_standardManeuvers_areAlwaysSafe() {
                        EmergencyIncident incident = EmergencyIncident.builder().build();

                        assertThat(responseExecutorService.validateAction(incident, ResponseAction.LAND).safe())
                                        .isTrue();
                        assertThat(responseExecutorService.validateAction(incident, ResponseAction.HOVER).safe())
                                        .isTrue();
                        assertThat(responseExecutorService.validateAction(incident, ResponseAction.DESCEND).safe())
                                        .isTrue();
                        assertThat(responseExecutorService.validateAction(incident, ResponseAction.CLIMB).safe())
                                        .isTrue();
                        assertThat(responseExecutorService.validateAction(incident, ResponseAction.ESTOP).safe())
                                        .isTrue();
                }

                @Test
                @DisplayName("validateAction for RTH fails when flightId is missing")
                void validateAction_rth_whenNoFlight_fails() {
                        EmergencyIncident incident = EmergencyIncident.builder().flightId(null).build();

                        var result = responseExecutorService.validateAction(incident, ResponseAction.RTH);

                        assertThat(result.safe()).isFalse();
                        assertThat(result.recommendedAction()).isEqualTo(ResponseAction.LAND);
                        assertThat(result.reason()).contains("No flight associated");
                }

                @Test
                @DisplayName("validateAction for RTH fails when departure hub coordinates are missing")
                void validateAction_rth_whenHubCoordinatesMissing_fails() {
                        EmergencyIncident incident = EmergencyIncident.builder()
                                        .flightId("fl-1")
                                        .latitude(10.762)
                                        .longitude(106.660)
                                        .build();

                        when(flightClient.getFlightById("fl-1")).thenReturn(Optional.of(
                                        new FlightClientService.FlightSummaryVm("fl-1", "FL-100", "dr-1", "hub-1",
                                                        "hub-2", "active")));
                        when(hubClient.getHubById("hub-1")).thenReturn(Optional.of(
                                        new HubClientService.HubLocationVm("hub-1", "SGN", "Saigon Hub", null, null,
                                                        "active")));

                        var result = responseExecutorService.validateAction(incident, ResponseAction.RTH);

                        assertThat(result.safe()).isFalse();
                        assertThat(result.recommendedAction()).isEqualTo(ResponseAction.LAND);
                        assertThat(result.reason()).contains("coordinates unavailable");
                }

                @Test
                @DisplayName("validateAction for RTH fails when battery is insufficient for return distance")
                void validateAction_rth_whenInsufficientBattery_fails() throws Exception {
                        EmergencyIncident incident = EmergencyIncident.builder()
                                        .flightId("fl-2")
                                        .latitude(37.98)
                                        .longitude(23.72)
                                        .detectionData("{\"batteryPercent\": 12.0}")
                                        .build();

                        when(incidentMapper.stringToJsonNode("{\"batteryPercent\": 12.0}"))
                                        .thenReturn(OBJECT_MAPPER.readTree("{\"batteryPercent\": 12.0}"));

                        when(flightClient.getFlightById("fl-2")).thenReturn(Optional.of(
                                        new FlightClientService.FlightSummaryVm("fl-2", "FL-200", "dr-2", "hub-ath",
                                                        "hub-skg", "active")));
                        when(hubClient.getHubById("hub-ath")).thenReturn(Optional.of(
                                        new HubClientService.HubLocationVm("hub-ath", "ATH", "Athens Hub", 40.64, 22.94,
                                                        "active")));

                        var result = responseExecutorService.validateAction(incident, ResponseAction.RTH);

                        assertThat(result.safe()).isFalse();
                        assertThat(result.recommendedAction()).isEqualTo(ResponseAction.LAND);
                        assertThat(result.reason()).contains("Insufficient battery for RTH");
                }

                @Test
                @DisplayName("validateAction for RTH succeeds when battery is sufficient for return distance")
                void validateAction_rth_whenBatterySufficient_succeeds() throws Exception {
                        EmergencyIncident incident = EmergencyIncident.builder()
                                        .flightId("fl-3")
                                        .latitude(10.762622)
                                        .longitude(106.660172)
                                        .detectionData("{\"batteryPercent\": 85.0}")
                                        .build();

                        when(incidentMapper.stringToJsonNode("{\"batteryPercent\": 85.0}"))
                                        .thenReturn(OBJECT_MAPPER.readTree("{\"batteryPercent\": 85.0}"));

                        when(flightClient.getFlightById("fl-3")).thenReturn(Optional.of(
                                        new FlightClientService.FlightSummaryVm("fl-3", "FL-300", "dr-3", "hub-d1",
                                                        "hub-d7", "active")));
                        when(hubClient.getHubById("hub-d1")).thenReturn(Optional.of(
                                        new HubClientService.HubLocationVm("hub-d1", "HUB1", "District 1 Hub",
                                                        10.770000, 106.670000, "active")));

                        var result = responseExecutorService.validateAction(incident, ResponseAction.RTH);

                        assertThat(result.safe()).isTrue();
                        assertThat(result.recommendedAction()).isEqualTo(ResponseAction.RTH);
                }

                @Test
                @DisplayName("validateAction for DIVERT succeeds when active hub is reachable with battery")
                void validateAction_divert_whenHubReachable_succeeds() throws Exception {
                        EmergencyIncident incident = EmergencyIncident.builder()
                                        .latitude(10.762622)
                                        .longitude(106.660172)
                                        .detectionData("{\"batteryPercent\": 50.0}")
                                        .build();

                        when(incidentMapper.stringToJsonNode("{\"batteryPercent\": 50.0}"))
                                        .thenReturn(OBJECT_MAPPER.readTree("{\"batteryPercent\": 50.0}"));

                        when(hubClient.getActiveHubs()).thenReturn(List.of(
                                        new HubClientService.HubLocationVm("hub-safe", "SAFE", "Safe Hub", 10.765000,
                                                        106.662000, "active")));

                        var result = responseExecutorService.validateAction(incident, ResponseAction.DIVERT);

                        assertThat(result.safe()).isTrue();
                        assertThat(result.recommendedAction()).isEqualTo(ResponseAction.DIVERT);
                }

                @Test
                @DisplayName("validateAction for DIVERT fails when no active safe zones are available")
                void validateAction_divert_whenNoActiveHubs_fails() {
                        EmergencyIncident incident = EmergencyIncident.builder()
                                        .latitude(10.762622)
                                        .longitude(106.660172)
                                        .build();

                        when(hubClient.getActiveHubs()).thenReturn(Collections.emptyList());

                        var result = responseExecutorService.validateAction(incident, ResponseAction.DIVERT);

                        assertThat(result.safe()).isFalse();
                        assertThat(result.recommendedAction()).isEqualTo(ResponseAction.LAND);
                        assertThat(result.reason()).contains("No active safe zones");
                }
        }

        @Nested
        @DisplayName("executeResponse Tests")
        class ExecuteResponseTests {

                @Test
                @DisplayName("executeResponse executes primary action when safe and records emergency blackbox")
                void executeResponse_whenPrimarySafe_executesAndRecordsBlackbox() {
                        EmergencyIncident incident = EmergencyIncident.builder()
                                        .id("inc-exec-1")
                                        .droneId("drone-100")
                                        .flightId("flight-100")
                                        .status(IncidentStatus.active)
                                        .detectedAt(ZonedDateTime.now(ZoneOffset.UTC))
                                        .build();

                        when(droneClient.sendEmergencyCommand("drone-100", "LAND", "flight-100", "inc-exec-1"))
                                        .thenReturn(true);
                        BlackboxEntry entry = new BlackboxEntry();
                        entry.setId("bb-exec-1");
                        when(blackboxMapper.toEmergencyEntity(incident, ResponseAction.LAND)).thenReturn(entry);
                        when(blackboxRepo.save(entry)).thenReturn(entry);
                        EmergencyIncidentVm vm = org.mockito.Mockito.mock(EmergencyIncidentVm.class);
                        when(incidentMapper.toVm(incident)).thenReturn(vm);

                        responseExecutorService.executeResponse(incident, ResponseAction.LAND, ResponseAction.HOVER);

                        assertThat(incident.getStatus()).isEqualTo(IncidentStatus.executing);
                        assertThat(incident.getResponseAction()).isEqualTo(ResponseAction.LAND);
                        assertThat(incident.getActionSuccess()).isTrue();

                        verify(droneClient).sendEmergencyCommand("drone-100", "LAND", "flight-100", "inc-exec-1");
                        verify(blackboxRepo).save(entry);
                        verify(incidentRepo, times(2)).save(incident);
                        verify(messagingTemplate, times(2)).convertAndSend(eq("/topic/emergency/incidents"), eq(vm));
                }

                @Test
                @DisplayName("executeResponse falls back to fallbackAction when primary action is unsafe")
                void executeResponse_whenPrimaryUnsafe_fallsBackToFallbackAction() {
                        EmergencyIncident incident = EmergencyIncident.builder()
                                        .id("inc-exec-2")
                                        .droneId("drone-200")
                                        .flightId(null)
                                        .status(IncidentStatus.active)
                                        .detectedAt(ZonedDateTime.now(ZoneOffset.UTC))
                                        .build();

                        when(droneClient.sendEmergencyCommand("drone-200", "HOVER", null, "inc-exec-2"))
                                        .thenReturn(true);
                        BlackboxEntry entry = new BlackboxEntry();
                        when(blackboxMapper.toEmergencyEntity(incident, ResponseAction.HOVER)).thenReturn(entry);
                        when(blackboxRepo.save(entry)).thenReturn(entry);

                        responseExecutorService.executeResponse(incident, ResponseAction.RTH, ResponseAction.HOVER);

                        assertThat(incident.getResponseAction()).isEqualTo(ResponseAction.HOVER);
                        assertThat(incident.getActionSuccess()).isTrue();

                        verify(droneClient).sendEmergencyCommand("drone-200", "HOVER", null, "inc-exec-2");
                }

                @Test
                @DisplayName("executeResponse records action error when droneClient dispatch fails")
                void executeResponse_whenDispatchFails_recordsError() {
                        EmergencyIncident incident = EmergencyIncident.builder()
                                        .id("inc-exec-3")
                                        .droneId("drone-300")
                                        .flightId("flight-300")
                                        .status(IncidentStatus.active)
                                        .detectedAt(ZonedDateTime.now(ZoneOffset.UTC))
                                        .build();

                        when(droneClient.sendEmergencyCommand("drone-300", "LAND", "flight-300", "inc-exec-3"))
                                        .thenReturn(false);
                        BlackboxEntry entry = new BlackboxEntry();
                        when(blackboxMapper.toEmergencyEntity(incident, ResponseAction.LAND)).thenReturn(entry);
                        when(blackboxRepo.save(entry)).thenReturn(entry);

                        responseExecutorService.executeResponse(incident, ResponseAction.LAND, null);

                        assertThat(incident.getActionSuccess()).isFalse();
                        assertThat(incident.getActionError()).contains("Failed to dispatch failsafe command");

                        verify(incidentRepo, times(2)).save(incident);
                }
        }
}
