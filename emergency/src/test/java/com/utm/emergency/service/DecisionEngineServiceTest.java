package com.utm.emergency.service;

import com.utm.emergency.mapper.EmergencyConfigMapper;
import com.utm.emergency.mapper.EmergencyIncidentMapper;
import com.utm.emergency.mapper.EmergencyProtocolMapper;
import com.utm.emergency.model.EmergencyConfig;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.EmergencyProtocol;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.OperationMode;
import com.utm.emergency.model.enumeration.ResponseAction;
import com.utm.emergency.repository.EmergencyConfigRepository;
import com.utm.emergency.repository.EmergencyIncidentRepository;
import com.utm.emergency.repository.EmergencyProtocolRepository;
import com.utm.emergency.service.client.AlertClientService;
import com.utm.emergency.viewmodel.config.OperationModeVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
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

    @BeforeEach
    void setUp() {
        when(protocolRepo.findByIsActiveOrderByPriorityAscEmergencyTypeAsc(true)).thenReturn(List.of(
                EmergencyProtocol.builder()
                        .name("Aircraft Proximity")
                        .emergencyType(EmergencyType.collision_aircraft)
                        .severity(EmergencySeverity.emergency)
                        .responseAction(ResponseAction.DESCEND)
                        .requiresConfirmation(false)
                        .build(),
                EmergencyProtocol.builder()
                        .name("Battery Low")
                        .emergencyType(EmergencyType.battery_low)
                        .severity(EmergencySeverity.warning)
                        .responseAction(ResponseAction.RTH)
                        .requiresConfirmation(true)
                        .confirmationTimeoutSeconds(30)
                        .build()));
        decisionEngineService.reloadProtocols();
    }

    @Test
    void testPrioritizeEmergencies() {
        EmergencyIncident i1 = EmergencyIncident.builder().emergencyType(EmergencyType.battery_low).build();
        EmergencyIncident i2 = EmergencyIncident.builder().emergencyType(EmergencyType.collision_aircraft).build();
        EmergencyIncident i3 = EmergencyIncident.builder().emergencyType(EmergencyType.motor_failure).build();

        List<EmergencyIncident> sorted = decisionEngineService.prioritizeEmergencies(List.of(i1, i2, i3));

        assertEquals(EmergencyType.collision_aircraft, sorted.get(0).getEmergencyType());
        assertEquals(EmergencyType.motor_failure, sorted.get(1).getEmergencyType());
        assertEquals(EmergencyType.battery_low, sorted.get(2).getEmergencyType());
    }

    @Test
    void testProcessEmergency_AutoExecuteImmediate() {
        EmergencyIncident incident = EmergencyIncident.builder()
                .id("inc-1")
                .droneId("drone-1")
                .emergencyType(EmergencyType.collision_aircraft)
                .severity(EmergencySeverity.emergency)
                .detectedAt(ZonedDateTime.now())
                .build();

        decisionEngineService.processEmergency(incident);

        verify(responseExecutorService).executeResponse(eq(incident), eq(ResponseAction.DESCEND), any());
    }

    @Test
    void testSetMode_BroadcastsMode() {
        when(configRepo.findByKey("operation_mode")).thenReturn(Optional.empty());
        EmergencyConfig config = new EmergencyConfig();
        when(configMapper.toEntity(eq("operation_mode"), any(String.class), any(String.class))).thenReturn(config);

        decisionEngineService.setMode(OperationMode.auto);

        verify(configRepo).save(config);
        verify(messagingTemplate).convertAndSend(eq("/topic/emergency/mode"),
                eq(new OperationModeVm(OperationMode.auto)));
    }
}