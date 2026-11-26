package com.utm.emergency.service;

import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.emergency.mapper.EmergencyConfigMapper;
import com.utm.emergency.mapper.EmergencyIncidentMapper;
import com.utm.emergency.mapper.EmergencyProtocolMapper;
import com.utm.emergency.model.EmergencyConfig;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.EmergencyProtocol;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.model.enumeration.OperationMode;
import com.utm.emergency.model.enumeration.ResponseAction;
import com.utm.emergency.repository.EmergencyConfigRepository;
import com.utm.emergency.repository.EmergencyIncidentRepository;
import com.utm.emergency.repository.EmergencyProtocolRepository;
import com.utm.emergency.service.client.AlertClientService;
import com.utm.emergency.viewmodel.client.AlertPostVm;
import com.utm.emergency.viewmodel.config.OperationModeVm;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentVm;
import com.utm.emergency.viewmodel.incident.PendingConfirmationVm;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolVm;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: DecisionEngineServiceImpl (Specification-Driven)")
class DecisionEngineServiceTest {

    @Mock
    private EmergencyIncidentRepository incidentRepo;

    @Mock
    private EmergencyProtocolRepository protocolRepo;

    @Mock
    private EmergencyConfigRepository configRepo;

    @Mock
    private EmergencyConfigMapper configMapper;

    @Mock
    private EmergencyIncidentMapper incidentMapper;

    @Mock
    private EmergencyProtocolMapper protocolMapper;

    @Mock
    private AlertClientService alertClient;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private ResponseExecutorService responseExecutorService;

    @InjectMocks
    private DecisionEngineServiceImpl decisionEngineService;

    @Captor
    private ArgumentCaptor<AlertPostVm> alertPostCaptor;

    private EmergencyProtocol aircraftCollisionProtocol;
    private EmergencyProtocol batteryLowProtocol;

    private EmergencyProtocolVm createSampleProtocolVm(EmergencyProtocol p) {
        return new EmergencyProtocolVm(
                p.getId(),
                p.getName(),
                p.getDescription(),
                p.getEmergencyType(),
                p.getSeverity(),
                p.getResponseAction(),
                p.getFallbackAction(),
                p.isRequiresConfirmation(),
                p.getConfirmationTimeoutSeconds(),
                p.isAutoExecuteOnTimeout(),
                p.getPriority(),
                p.isActive(),
                p.isSystemDefault(),
                null,
                null);
    }

    private EmergencyIncidentVm createSampleIncidentVm(String id, String droneId, String flightId, EmergencyType type,
            EmergencySeverity severity, IncidentStatus status) {
        return new EmergencyIncidentVm(
                id,
                "INC-20261107-TEST",
                droneId,
                flightId,
                null,
                type,
                severity,
                status,
                "Emergency test message",
                null,
                null,
                null,
                null,
                ResponseAction.RTH,
                false,
                true,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                ZonedDateTime.now(ZoneOffset.UTC),
                ZonedDateTime.now(ZoneOffset.UTC),
                ZonedDateTime.now(ZoneOffset.UTC));
    }

    @BeforeEach
    void setUp() {
        aircraftCollisionProtocol = EmergencyProtocol.builder()
                .id("10000000-0000-4000-8000-000000000001")
                .name("Aircraft Proximity")
                .emergencyType(EmergencyType.COLLISION_AIRCRAFT)
                .severity(EmergencySeverity.EMERGENCY)
                .responseAction(ResponseAction.DESCEND)
                .fallbackAction(ResponseAction.LAND)
                .requiresConfirmation(false)
                .confirmationTimeoutSeconds(0)
                .autoExecuteOnTimeout(true)
                .priority(1)
                .build();

        batteryLowProtocol = EmergencyProtocol.builder()
                .id("10000000-0000-4000-8000-000000000010")
                .name("Battery Low")
                .emergencyType(EmergencyType.BATTERY_LOW)
                .severity(EmergencySeverity.WARNING)
                .responseAction(ResponseAction.RTH)
                .fallbackAction(ResponseAction.LAND)
                .requiresConfirmation(true)
                .confirmationTimeoutSeconds(30)
                .autoExecuteOnTimeout(true)
                .priority(45)
                .build();

        when(protocolRepo.findByIsActiveOrderByPriorityAscEmergencyTypeAsc(true))
                .thenReturn(List.of(aircraftCollisionProtocol, batteryLowProtocol));
        decisionEngineService.reloadProtocols();
    }

    @AfterEach
    void tearDown() {
        decisionEngineService.destroy();
    }

    @Nested
    @DisplayName("prioritizeEmergencies Tests")
    class PrioritizeEmergenciesTests {

        @Test
        @DisplayName("prioritizeEmergencies sorts incidents according to aviation safety severity hierarchy")
        void prioritizeEmergencies_sortsByHierarchy() {
            EmergencyIncident i1 = EmergencyIncident.builder().id("1").emergencyType(EmergencyType.BATTERY_LOW).build();
            EmergencyIncident i2 = EmergencyIncident.builder().id("2").emergencyType(EmergencyType.COLLISION_AIRCRAFT)
                    .build();
            EmergencyIncident i3 = EmergencyIncident.builder().id("3").emergencyType(EmergencyType.MOTOR_FAILURE)
                    .build();

            List<EmergencyIncident> sorted = decisionEngineService.prioritizeEmergencies(List.of(i1, i2, i3));

            assertThat(sorted).hasSize(3);
            assertThat(sorted.get(0).getEmergencyType()).isEqualTo(EmergencyType.COLLISION_AIRCRAFT);
            assertThat(sorted.get(1).getEmergencyType()).isEqualTo(EmergencyType.MOTOR_FAILURE);
            assertThat(sorted.get(2).getEmergencyType()).isEqualTo(EmergencyType.BATTERY_LOW);
        }

        @Test
        @DisplayName("prioritizeEmergencies with null input returns empty list")
        void prioritizeEmergencies_withNull_returnsEmptyList() {
            assertThat(decisionEngineService.prioritizeEmergencies(null)).isEmpty();
        }
    }

    @Nested
    @DisplayName("findMatchingProtocol Tests")
    class FindMatchingProtocolTests {

        @Test
        @DisplayName("findMatchingProtocol matches exact emergency type and severity")
        void findMatchingProtocol_exactMatch() {
            EmergencyProtocol result = decisionEngineService.findMatchingProtocol(EmergencyType.COLLISION_AIRCRAFT,
                    EmergencySeverity.EMERGENCY);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo("10000000-0000-4000-8000-000000000001");
            assertThat(result.getResponseAction()).isEqualTo(ResponseAction.DESCEND);
        }

        @Test
        @DisplayName("findMatchingProtocol falls back to type match when severity does not match")
        void findMatchingProtocol_fallbackToType() {
            EmergencyProtocol result = decisionEngineService.findMatchingProtocol(EmergencyType.BATTERY_LOW,
                    EmergencySeverity.CRITICAL);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo("10000000-0000-4000-8000-000000000010");
        }

        @Test
        @DisplayName("findMatchingProtocol returns null when no matching protocol exists")
        void findMatchingProtocol_whenNotFound_returnsNull() {
            EmergencyProtocol result = decisionEngineService.findMatchingProtocol(EmergencyType.GPS_DEGRADED,
                    EmergencySeverity.WARNING);

            assertThat(result).isNull();
        }
    }

    @Nested
    @DisplayName("processEmergency Tests")
    class ProcessEmergencyTests {

        @Test
        @DisplayName("processEmergency immediately auto-executes when protocol does not require confirmation")
        void processEmergency_immediateAutoExecute() {
            EmergencyIncident incident = EmergencyIncident.builder()
                    .id("inc-auto-1")
                    .droneId("drone-100")
                    .flightId("flight-100")
                    .emergencyType(EmergencyType.COLLISION_AIRCRAFT)
                    .severity(EmergencySeverity.EMERGENCY)
                    .detectedAt(ZonedDateTime.now(ZoneOffset.UTC))
                    .message("Direct collision course with intruder aircraft")
                    .build();

            decisionEngineService.processEmergency(incident);

            assertThat(incident.isWasAutoExecuted()).isTrue();
            assertThat(incident.getProtocolId()).isEqualTo("10000000-0000-4000-8000-000000000001");
            verify(alertClient).publishAlert(alertPostCaptor.capture());
            assertThat(alertPostCaptor.getValue().message()).contains("AUTO FAILSAFE: DESCEND");
            assertThat(alertPostCaptor.getValue().incidentId()).isEqualTo("inc-auto-1");
            assertThat(alertPostCaptor.getValue().alertType()).isEqualTo("COLLISION_WARNING");
            verify(responseExecutorService).executeResponse(incident, ResponseAction.DESCEND, ResponseAction.LAND);
        }

        @Test
        @DisplayName("processEmergency queues incident for confirmation when in supervised mode and protocol requires it")
        void processEmergency_supervisedConfirmationQueue() {
            EmergencyIncident incident = EmergencyIncident.builder()
                    .id("inc-supervised-1")
                    .droneId("drone-200")
                    .flightId("flight-200")
                    .emergencyType(EmergencyType.BATTERY_LOW)
                    .severity(EmergencySeverity.WARNING)
                    .detectedAt(ZonedDateTime.now(ZoneOffset.UTC))
                    .message("Battery dropped below 20%")
                    .build();

            EmergencyIncidentVm incVm = createSampleIncidentVm("inc-supervised-1", "drone-200", "flight-200",
                    EmergencyType.BATTERY_LOW, EmergencySeverity.WARNING, IncidentStatus.PENDING_CONFIRMATION);

            when(incidentMapper.toVm(incident)).thenReturn(incVm);
            when(protocolMapper.toVm(batteryLowProtocol)).thenReturn(createSampleProtocolVm(batteryLowProtocol));

            decisionEngineService.processEmergency(incident);

            assertThat(incident.getStatus()).isEqualTo(IncidentStatus.PENDING_CONFIRMATION);
            assertThat(incident.getProtocolId()).isEqualTo("10000000-0000-4000-8000-000000000010");
            assertThat(incident.isConfirmationRequired()).isTrue();
            assertThat(incident.getConfirmationTimeoutAt()).isNotNull();
            assertThat(incident.getResponseAction()).isEqualTo(ResponseAction.RTH);

            verify(incidentRepo).save(incident);
            verify(messagingTemplate).convertAndSend(eq("/topic/emergency/pending"), any(PendingConfirmationVm.class));
            verify(alertClient).publishAlert(alertPostCaptor.capture());
            assertThat(alertPostCaptor.getValue().message()).contains("Action RTH awaits confirmation");
            assertThat(alertPostCaptor.getValue().incidentId()).isEqualTo("inc-supervised-1");

            List<PendingConfirmationVm> pending = decisionEngineService.getPendingConfirmations();
            assertThat(pending).hasSize(1);
            assertThat(pending.get(0).incidentId()).isEqualTo("inc-supervised-1");
        }

        @Test
        @DisplayName("processEmergency executes immediate LAND and publishes fallback alert when no protocol is configured")
        void processEmergency_whenNoProtocol_executesImmediateLand() {
            EmergencyIncident incident = EmergencyIncident.builder()
                    .id("inc-unmatched")
                    .droneId("drone-weather-1")
                    .flightId("flight-weather-1")
                    .emergencyType(EmergencyType.WEATHER_VISIBILITY)
                    .severity(EmergencySeverity.WARNING)
                    .message("Visibility dropped below safe threshold")
                    .build();

            decisionEngineService.processEmergency(incident);

            verify(alertClient).publishAlert(alertPostCaptor.capture());
            assertThat(alertPostCaptor.getValue().alertType()).isEqualTo("WEATHER_HAZARD");
            assertThat(alertPostCaptor.getValue().severity()).isEqualTo("MEDIUM");
            verify(responseExecutorService).executeResponse(incident, ResponseAction.LAND, null);
        }
    }

    @Nested
    @DisplayName("confirmAction Tests")
    class ConfirmActionTests {

        @Test
        @DisplayName("confirmAction when approved executes failsafe response and broadcasts confirmed event")
        void confirmAction_whenApproved_executesResponse() {
            EmergencyIncident incident = EmergencyIncident.builder()
                    .id("inc-confirm-1")
                    .droneId("drone-200")
                    .flightId("flight-200")
                    .emergencyType(EmergencyType.BATTERY_LOW)
                    .severity(EmergencySeverity.WARNING)
                    .detectedAt(ZonedDateTime.now(ZoneOffset.UTC))
                    .message("Battery low")
                    .build();

            when(incidentMapper.toVm(incident)).thenReturn(createSampleIncidentVm("inc-confirm-1", "drone-200",
                    "flight-200", EmergencyType.BATTERY_LOW, EmergencySeverity.WARNING, IncidentStatus.EXECUTING));
            when(protocolMapper.toVm(batteryLowProtocol)).thenReturn(createSampleProtocolVm(batteryLowProtocol));

            decisionEngineService.processEmergency(incident);

            EmergencyIncidentVm result = decisionEngineService.confirmAction("inc-confirm-1", true, "atc_sarah");

            assertThat(result).isNotNull();
            assertThat(incident.getConfirmedBy()).isEqualTo("atc_sarah");
            assertThat(incident.getConfirmedAt()).isNotNull();

            verify(responseExecutorService).executeResponse(incident, ResponseAction.RTH, ResponseAction.LAND);
            verify(messagingTemplate).convertAndSend(eq("/topic/emergency/confirmed"), any(Object.class));
            assertThat(decisionEngineService.getPendingConfirmations()).isEmpty();
        }

        @Test
        @DisplayName("confirmAction when rejected marks incident as REJECTED with notes and resolves linked alerts")
        void confirmAction_whenRejected_marksRejected() {
            EmergencyIncident incident = EmergencyIncident.builder()
                    .id("inc-confirm-2")
                    .droneId("drone-200")
                    .flightId("flight-200")
                    .emergencyType(EmergencyType.BATTERY_LOW)
                    .severity(EmergencySeverity.WARNING)
                    .detectedAt(ZonedDateTime.now(ZoneOffset.UTC))
                    .message("Battery low")
                    .build();

            when(incidentMapper.toVm(incident)).thenReturn(createSampleIncidentVm("inc-confirm-2", "drone-200",
                    "flight-200", EmergencyType.BATTERY_LOW, EmergencySeverity.WARNING, IncidentStatus.REJECTED));
            when(protocolMapper.toVm(batteryLowProtocol)).thenReturn(createSampleProtocolVm(batteryLowProtocol));

            decisionEngineService.processEmergency(incident);

            EmergencyIncidentVm result = decisionEngineService.confirmAction("inc-confirm-2", false, "pilot_mike");

            assertThat(result).isNotNull();
            assertThat(incident.getStatus()).isEqualTo(IncidentStatus.REJECTED);
            assertThat(incident.getResolutionNotes()).isEqualTo("Action rejected by operator");
            assertThat(incident.getResolvedBy()).isEqualTo("pilot_mike");

            verify(incidentRepo, times(2)).save(incident);
            verify(alertClient).resolveAlertsByIncident(eq("inc-confirm-2"), contains("rejected"));
            verify(responseExecutorService, never()).executeResponse(any(), any(), any());
            assertThat(decisionEngineService.getPendingConfirmations()).isEmpty();
        }

        @Test
        @DisplayName("confirmAction recovers pending confirmation from DB when in-memory queue was cleared after restart")
        void confirmAction_whenPendingInDbAfterRestart_executesResponse() {
            EmergencyIncident dbIncident = EmergencyIncident.builder()
                    .id("inc-restart-1")
                    .droneId("drone-201")
                    .flightId("flight-201")
                    .emergencyType(EmergencyType.BATTERY_LOW)
                    .severity(EmergencySeverity.WARNING)
                    .status(IncidentStatus.PENDING_CONFIRMATION)
                    .responseAction(ResponseAction.RTH)
                    .detectedAt(ZonedDateTime.now(ZoneOffset.UTC))
                    .build();

            when(incidentRepo.findById("inc-restart-1")).thenReturn(Optional.of(dbIncident));
            when(incidentMapper.toVm(dbIncident)).thenReturn(createSampleIncidentVm("inc-restart-1", "drone-201",
                    "flight-201", EmergencyType.BATTERY_LOW, EmergencySeverity.WARNING, IncidentStatus.EXECUTING));

            EmergencyIncidentVm result = decisionEngineService.confirmAction("inc-restart-1", true, "atc_ops");

            assertThat(result).isNotNull();
            assertThat(dbIncident.getConfirmedBy()).isEqualTo("atc_ops");
            verify(responseExecutorService).executeResponse(dbIncident, ResponseAction.RTH, ResponseAction.LAND);
        }

        @Test
        @DisplayName("confirmAction throws NotFoundException when incident is not in pending confirmation queue")
        void confirmAction_whenNotPending_throwsNotFoundException() {
            assertThatThrownBy(() -> decisionEngineService.confirmAction("non-existent-inc", true, "atc"))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessage("Pending confirmation for incident is not found")
                    .extracting(ex -> ((NotFoundException) ex).getParams().get("id"))
                    .isEqualTo("non-existent-inc");
        }
    }

    @Nested
    @DisplayName("setMode and operation mode Tests")
    class SetModeTests {

        @Test
        @DisplayName("setMode saves config to repository and broadcasts mode update via WebSocket")
        void setMode_savesConfigAndBroadcasts() {
            when(configRepo.findByKey("operation_mode")).thenReturn(Optional.empty());
            EmergencyConfig config = new EmergencyConfig();
            when(configMapper.toEntity(eq("operation_mode"), eq("\"auto\""), any(String.class))).thenReturn(config);

            decisionEngineService.setMode(OperationMode.AUTO);

            assertThat(decisionEngineService.getMode()).isEqualTo(OperationMode.AUTO);
            verify(configRepo).save(config);
            verify(messagingTemplate).convertAndSend(eq("/topic/emergency/mode"),
                    eq(new OperationModeVm(OperationMode.AUTO)));
        }
    }

    @Nested
    @DisplayName("handleTimeout Tests")
    class HandleTimeoutTests {

        @Test
        @DisplayName("handleTimeout auto-executes when protocol has autoExecuteOnTimeout=true")
        void handleTimeout_whenAutoExecuteTrue_executesResponse() {
            EmergencyIncident incident = EmergencyIncident.builder()
                    .id("inc-timeout-1")
                    .droneId("drone-300")
                    .flightId("flight-300")
                    .emergencyType(EmergencyType.BATTERY_LOW)
                    .severity(EmergencySeverity.WARNING)
                    .status(IncidentStatus.PENDING_CONFIRMATION)
                    .detectedAt(ZonedDateTime.now(ZoneOffset.UTC))
                    .build();

            when(incidentMapper.toVm(incident))
                    .thenReturn(createSampleIncidentVm("inc-timeout-1", "drone-300", "flight-300",
                            EmergencyType.BATTERY_LOW, EmergencySeverity.WARNING, IncidentStatus.PENDING_CONFIRMATION));
            when(protocolMapper.toVm(batteryLowProtocol)).thenReturn(createSampleProtocolVm(batteryLowProtocol));
            when(incidentRepo.findById("inc-timeout-1")).thenReturn(Optional.of(incident));

            decisionEngineService.processEmergency(incident);

            decisionEngineService.handleTimeout("inc-timeout-1");

            assertThat(incident.isWasAutoExecuted()).isTrue();
            verify(responseExecutorService).executeResponse(incident, ResponseAction.RTH, ResponseAction.LAND);
        }
    }
}
