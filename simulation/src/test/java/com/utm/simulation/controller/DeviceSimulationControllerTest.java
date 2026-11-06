package com.utm.simulation.controller;

import com.utm.simulation.service.DeviceKeepAliveService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: DeviceSimulationController")
class DeviceSimulationControllerTest {

    private static final String DEVICE_ID = "DEV-VN-001";

    @Mock
    private DeviceKeepAliveService deviceKeepAliveService;

    @InjectMocks
    private DeviceSimulationController controller;

    @Test
    @DisplayName("POST /api/v1/simulation/devices/{id}/power-on - Should power on device and return 204")
    void powerOn_callsServiceAndReturnsNoContent() {
        ResponseEntity<Void> response = controller.powerOn(DEVICE_ID);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(deviceKeepAliveService).powerOn(DEVICE_ID);
    }

    @Test
    @DisplayName("POST /api/v1/simulation/devices/{id}/power-off - Should power off device and return 204")
    void powerOff_callsServiceAndReturnsNoContent() {
        ResponseEntity<Void> response = controller.powerOff(DEVICE_ID);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(deviceKeepAliveService).powerOff(DEVICE_ID);
    }
}

