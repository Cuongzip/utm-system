package com.utm.simulation.service;

import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.simulation.service.client.ConnectivityClientService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: DeviceKeepAliveServiceImpl (Specification-Driven)")
class DeviceKeepAliveServiceImplTest {

    private static final String DEVICE_ID = "DEV-VN-001";

    @Mock
    private ConnectivityClientService connectivityClientService;

    @InjectMocks
    private DeviceKeepAliveServiceImpl keepAliveService;

    @BeforeEach
    void setUp() {
        @SuppressWarnings("unchecked")
        Set<String> activeDevices = (Set<String>) ReflectionTestUtils.getField(keepAliveService, "activeDeviceIds");
        if (activeDevices != null) {
            activeDevices.clear();
        }
    }

    @AfterEach
    void tearDown() {
        keepAliveService.destroy();
    }

    @Nested
    @DisplayName("powerOn")
    class PowerOn {

        @Test
        @DisplayName("whenIdNullOrBlank_throwsBadRequestException")
        void whenIdNullOrBlank_throwsBadRequestException() {
            assertThatThrownBy(() -> keepAliveService.powerOn(null))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Device ID cannot be blank");

            assertThatThrownBy(() -> keepAliveService.powerOn("   "))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Device ID cannot be blank");

            verify(connectivityClientService, never()).sendHeartbeat(anyString());
        }

        @Test
        @DisplayName("whenInitialHeartbeatFails_throwsBadRequestException")
        void whenInitialHeartbeatFails_throwsBadRequestException() {
            when(connectivityClientService.sendHeartbeat(DEVICE_ID)).thenReturn(false);

            assertThatThrownBy(() -> keepAliveService.powerOn(DEVICE_ID))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Failed to establish initial heartbeat");

            @SuppressWarnings("unchecked")
            Set<String> activeDevices = (Set<String>) ReflectionTestUtils.getField(keepAliveService, "activeDeviceIds");
            assertThat(activeDevices).doesNotContain(DEVICE_ID);
        }

        @Test
        @DisplayName("whenHeartbeatSucceeds_activatesDeviceKeepalive")
        void whenHeartbeatSucceeds_activatesDeviceKeepalive() {
            when(connectivityClientService.sendHeartbeat(DEVICE_ID)).thenReturn(true);

            keepAliveService.powerOn(DEVICE_ID);

            @SuppressWarnings("unchecked")
            Set<String> activeDevices = (Set<String>) ReflectionTestUtils.getField(keepAliveService, "activeDeviceIds");
            assertThat(activeDevices).contains(DEVICE_ID);
            verify(connectivityClientService).sendHeartbeat(DEVICE_ID);
        }
    }

    @Nested
    @DisplayName("powerOff")
    class PowerOff {

        @Test
        @DisplayName("whenIdNullOrBlank_throwsBadRequestException")
        void whenIdNullOrBlank_throwsBadRequestException() {
            assertThatThrownBy(() -> keepAliveService.powerOff(null))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Device ID cannot be blank");
        }

        @Test
        @DisplayName("whenValidId_deactivatesDeviceKeepalive")
        void whenValidId_deactivatesDeviceKeepalive() {
            @SuppressWarnings("unchecked")
            Set<String> activeDevices = (Set<String>) ReflectionTestUtils.getField(keepAliveService, "activeDeviceIds");
            if (activeDevices != null) {
                activeDevices.add(DEVICE_ID);
            }

            keepAliveService.powerOff(DEVICE_ID);

            assertThat(activeDevices).doesNotContain(DEVICE_ID);
        }
    }

    @Nested
    @DisplayName("tickKeepAlive")
    class TickKeepAlive {

        @Test
        @DisplayName("whenNoActiveDevices_doesNotSendHeartbeat")
        void whenNoActiveDevices_doesNotSendHeartbeat() {
            ReflectionTestUtils.invokeMethod(keepAliveService, "tickKeepAlive");

            verify(connectivityClientService, never()).sendHeartbeat(anyString());
        }

        @Test
        @DisplayName("whenActiveDevicesPresent_sendsHeartbeats")
        void whenActiveDevicesPresent_sendsHeartbeats() {
            @SuppressWarnings("unchecked")
            Set<String> activeDevices = (Set<String>) ReflectionTestUtils.getField(keepAliveService, "activeDeviceIds");
            if (activeDevices != null) {
                activeDevices.add(DEVICE_ID);
            }

            when(connectivityClientService.sendHeartbeat(DEVICE_ID)).thenReturn(true);

            ReflectionTestUtils.invokeMethod(keepAliveService, "tickKeepAlive");

            verify(connectivityClientService).sendHeartbeat(DEVICE_ID);
            assertThat(activeDevices).contains(DEVICE_ID);
        }

        @Test
        @DisplayName("whenDeviceNotFoundDuringTick_removesFromActiveDevices")
        void whenDeviceNotFoundDuringTick_removesFromActiveDevices() {
            @SuppressWarnings("unchecked")
            Set<String> activeDevices = (Set<String>) ReflectionTestUtils.getField(keepAliveService, "activeDeviceIds");
            if (activeDevices != null) {
                activeDevices.add(DEVICE_ID);
            }

            doThrow(new NotFoundException("DEVICE_NOT_FOUND", DEVICE_ID))
                    .when(connectivityClientService).sendHeartbeat(DEVICE_ID);

            ReflectionTestUtils.invokeMethod(keepAliveService, "tickKeepAlive");

            assertThat(activeDevices).doesNotContain(DEVICE_ID);
        }
    }
}

