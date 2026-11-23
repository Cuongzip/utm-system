package com.utm.emergency.service.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.emergency.config.ServiceUrlConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: DroneClientServiceImpl (Emergency Action Mapping)")
class DroneClientServiceImplTest {

    @Mock
    private RestClient restClient;

    @Mock
    private ServiceUrlConfig serviceUrlConfig;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private DroneClientServiceImpl droneClientService;

    @Test
    @DisplayName("mapToDroneCommandType maps every emergency ResponseAction to a valid drone CommandType")
    void mapToDroneCommandType_mapsAllEmergencyActionsCorrectly() {
        assertThat(DroneClientServiceImpl.mapToDroneCommandType("RTH")).isEqualTo("RTL");
        assertThat(DroneClientServiceImpl.mapToDroneCommandType("ESTOP")).isEqualTo("EMERGENCY_STOP");
        assertThat(DroneClientServiceImpl.mapToDroneCommandType("DIVERT")).isEqualTo("GOTO");
        assertThat(DroneClientServiceImpl.mapToDroneCommandType("DESCEND")).isEqualTo("SET_ALTITUDE");
        assertThat(DroneClientServiceImpl.mapToDroneCommandType("CLIMB")).isEqualTo("SET_ALTITUDE");
        assertThat(DroneClientServiceImpl.mapToDroneCommandType("LAND")).isEqualTo("LAND");
        assertThat(DroneClientServiceImpl.mapToDroneCommandType("HOVER")).isEqualTo("HOVER");
        assertThat(DroneClientServiceImpl.mapToDroneCommandType("NONE")).isNull();
    }

    @Test
    @DisplayName("sendEmergencyCommand skips HTTP dispatch and returns true for NONE action")
    void sendEmergencyCommand_whenNone_skipsHttpDispatch() {
        boolean result = droneClientService.sendEmergencyCommand("drone-1", "NONE", "flight-1", "inc-1");

        assertThat(result).isTrue();
        verifyNoInteractions(restClient);
    }
}
