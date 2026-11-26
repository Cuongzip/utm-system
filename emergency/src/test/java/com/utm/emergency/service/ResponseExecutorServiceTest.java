package com.utm.emergency.service;

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
import com.utm.emergency.service.client.TelemetryClientService;
import com.utm.emergency.viewmodel.client.FlightSummaryVm;
import com.utm.emergency.viewmodel.client.HubLocationVm;
import com.utm.emergency.viewmodel.client.TelemetryStreamVm;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentVm;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
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
    private TelemetryClientService telemetryClient;

    @Mock
    private EmergencyIncidentMapper incidentMapper;

    @Mock
    private BlackboxEntryMapper blackboxMapper;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private ResponseExecutorServiceImpl responseExecutorService;

    @Nested
    @DisplayName("validateAction Tests")
    class ValidateActionTests {

        @Test
        @DisplayName("validateAction returns safe for standard vertical and hover maneuvers")
        void validateAction_standardManeuvers_areAlwaysSafe() {
            EmergencyIncident incident = EmergencyIncident.builder().build();

            assertThat(responseExecutorService.validateAction(incident, ResponseAction.LAND).safe()).isTrue();
            assertThat(responseExecutorService.validateAction(incident, ResponseAction.HOVER).safe()).isTrue();
            assertThat(responseExecutorService.validateAction(incident, ResponseAction.DESCEND).safe()).isTrue();
            assertThat(responseExecutorService.validateAction(incident, ResponseAction.CLIMB).safe()).isTrue();
            assertThat(responseExecutorService.validateAction(incident, ResponseAction.ESTOP).safe()).isTrue();
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
                    new FlightSummaryVm("fl-1", "FL-100", "dr-1", "hub-1", "hub-2", "active")));
            when(hubClient.getHubById("hub-1")).thenReturn(Optional.of(
                    new HubLocationVm("hub-1", "SGN", "Saigon Hub", null, null, "active")));

            var result = responseExecutorService.validateAction(incident, ResponseAction.RTH);

            assertThat(result.safe()).isFalse();
            assertThat(result.recommendedAction()).isEqualTo(ResponseAction.LAND);
            assertThat(result.reason()).contains("coordinates unavailable");
        }

        @Test
        @DisplayName("validateAction for RTH fails when battery is insufficient for return distance")
        void validateAction_rth_whenInsufficientBattery_fails() {
            EmergencyIncident incident = EmergencyIncident.builder()
                    .flightId("fl-2")
                    .latitude(37.98)
                    .longitude(23.72)
                    .detectionData(Map.of("batteryPercent", 12.0))
                    .build();

            when(flightClient.getFlightById("fl-2")).thenReturn(Optional.of(
                    new FlightSummaryVm("fl-2", "FL-200", "dr-2", "hub-ath", "hub-skg", "active")));
            when(hubClient.getHubById("hub-ath")).thenReturn(Optional.of(
                    new HubLocationVm("hub-ath", "ATH", "Athens Hub", 40.64, 22.94, "active")));

            var result = responseExecutorService.validateAction(incident, ResponseAction.RTH);

            assertThat(result.safe()).isFalse();
            assertThat(result.recommendedAction()).isEqualTo(ResponseAction.LAND);
            assertThat(result.reason()).contains("Insufficient battery for RTH");
        }

        @Test
        @DisplayName("validateAction for RTH reads batteryPercentage key and rejects low battery")
        void validateAction_rth_whenBatteryPercentageKeyIsLow_fails() {
            EmergencyIncident incident = EmergencyIncident.builder()
                    .flightId("fl-2b")
                    .latitude(10.762622)
                    .longitude(106.660172)
                    .detectionData(Map.of("batteryPercentage", 5.0))
                    .build();

            when(flightClient.getFlightById("fl-2b")).thenReturn(Optional.of(
                    new FlightSummaryVm("fl-2b", "FL-201", "dr-2b", "hub-d1", "hub-d7", "active")));
            when(hubClient.getHubById("hub-d1")).thenReturn(Optional.of(
                    new HubLocationVm("hub-d1", "HUB1", "District 1 Hub", 10.770000, 106.670000, "active")));

            var result = responseExecutorService.validateAction(incident, ResponseAction.RTH);

            assertThat(result.safe()).isFalse();
            assertThat(result.recommendedAction()).isEqualTo(ResponseAction.LAND);
            assertThat(result.reason()).contains("have 5%");
        }

        @Test
        @DisplayName("validateAction for RTH succeeds when battery is sufficient for return distance")
        void validateAction_rth_whenBatterySufficient_succeeds() {
            EmergencyIncident incident = EmergencyIncident.builder()
                    .flightId("fl-3")
                    .latitude(10.762622)
                    .longitude(106.660172)
                    .detectionData(Map.of("batteryPercent", 85.0))
                    .build();

            when(flightClient.getFlightById("fl-3")).thenReturn(Optional.of(
                    new FlightSummaryVm("fl-3", "FL-300", "dr-3", "hub-d1", "hub-d7", "active")));
            when(hubClient.getHubById("hub-d1")).thenReturn(Optional.of(
                    new HubLocationVm("hub-d1", "HUB1", "District 1 Hub", 10.770000, 106.670000, "active")));

            var result = responseExecutorService.validateAction(incident, ResponseAction.RTH);

            assertThat(result.safe()).isTrue();
            assertThat(result.recommendedAction()).isEqualTo(ResponseAction.RTH);
        }

        @Test
        @DisplayName("validateAction for DIVERT succeeds when active hub is reachable with battery")
        void validateAction_divert_whenHubReachable_succeeds() {
            EmergencyIncident incident = EmergencyIncident.builder()
                    .latitude(10.762622)
                    .longitude(106.660172)
                    .detectionData(Map.of("batteryPercent", 50.0))
                    .build();

            when(hubClient.getActiveHubs()).thenReturn(List.of(
                    new HubLocationVm("hub-safe", "SAFE", "Safe Hub", 10.765000, 106.662000, "active")));

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
        @DisplayName("executeResponse executes primary action when safe and records emergency blackbox with live telemetry")
        void executeResponse_whenPrimarySafe_executesAndRecordsBlackbox() {
            EmergencyIncident incident = EmergencyIncident.builder()
                    .id("inc-exec-1")
                    .droneId("drone-100")
                    .flightId("flight-100")
                    .status(IncidentStatus.ACTIVE)
                    .detectedAt(ZonedDateTime.now(ZoneOffset.UTC))
                    .build();

            TelemetryStreamVm liveTelemetry = new TelemetryStreamVm(
                    "drone-100", "flight-100", 10.77, 106.70, 82.0, 12.5, 180.0, 14.2, ZonedDateTime.now(ZoneOffset.UTC));
            when(telemetryClient.getLatestByDroneId("drone-100")).thenReturn(Optional.of(liveTelemetry));
            when(droneClient.sendEmergencyCommand("drone-100", "LAND", "flight-100", "inc-exec-1"))
                    .thenReturn(true);
            BlackboxEntry entry = new BlackboxEntry();
            entry.setId("bb-exec-1");
            when(blackboxMapper.toEmergencyEntity(incident, ResponseAction.LAND, liveTelemetry)).thenReturn(entry);
            when(blackboxRepo.save(entry)).thenReturn(entry);
            EmergencyIncidentVm vm = org.mockito.Mockito.mock(EmergencyIncidentVm.class);
            when(incidentMapper.toVm(incident)).thenReturn(vm);

            responseExecutorService.executeResponse(incident, ResponseAction.LAND, ResponseAction.HOVER);

            assertThat(incident.getStatus()).isEqualTo(IncidentStatus.EXECUTING);
            assertThat(incident.getResponseAction()).isEqualTo(ResponseAction.LAND);
            assertThat(incident.getActionSuccess()).isTrue();

            verify(droneClient).sendEmergencyCommand("drone-100", "LAND", "flight-100", "inc-exec-1");
            verify(blackboxMapper).toEmergencyEntity(incident, ResponseAction.LAND, liveTelemetry);
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
                    .status(IncidentStatus.ACTIVE)
                    .detectedAt(ZonedDateTime.now(ZoneOffset.UTC))
                    .build();

            when(telemetryClient.getLatestByDroneId("drone-200")).thenReturn(Optional.empty());
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
                    .status(IncidentStatus.ACTIVE)
                    .detectedAt(ZonedDateTime.now(ZoneOffset.UTC))
                    .build();

            when(telemetryClient.getLatestByDroneId("drone-300")).thenReturn(Optional.empty());
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

        @Test
        @DisplayName("executeResponse skips drone command dispatch when resolved action is NONE")
        void executeResponse_whenActionIsNone_skipsDroneCommandDispatch() {
            EmergencyIncident incident = EmergencyIncident.builder()
                    .id("inc-exec-none")
                    .droneId("drone-400")
                    .flightId("flight-400")
                    .status(IncidentStatus.ACTIVE)
                    .detectedAt(ZonedDateTime.now(ZoneOffset.UTC))
                    .build();

            when(telemetryClient.getLatestByDroneId("drone-400")).thenReturn(Optional.empty());
            BlackboxEntry entry = new BlackboxEntry();
            when(blackboxMapper.toEmergencyEntity(incident, ResponseAction.NONE)).thenReturn(entry);
            when(blackboxRepo.save(entry)).thenReturn(entry);

            responseExecutorService.executeResponse(incident, ResponseAction.NONE, null);

            assertThat(incident.getResponseAction()).isEqualTo(ResponseAction.NONE);
            assertThat(incident.getActionSuccess()).isTrue();
            verify(droneClient, never()).sendEmergencyCommand(any(), any(), any(), any());
        }
    }
}
