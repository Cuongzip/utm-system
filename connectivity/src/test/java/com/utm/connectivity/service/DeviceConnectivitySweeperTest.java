package com.utm.connectivity.service;

import com.utm.connectivity.mapper.DeviceRegistrationMapper;
import com.utm.connectivity.model.DeviceRegistration;
import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import com.utm.connectivity.model.enumeration.DeviceRegistrationStatus;
import com.utm.connectivity.repository.DeviceRegistrationRepository;
import com.utm.connectivity.service.client.DroneClientService;
import com.utm.connectivity.viewmodel.device.DeviceHeartbeatPostVm;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: DeviceRegistrationServiceImpl Sweeper & Lookup")
class DeviceConnectivitySweeperTest {

    @Mock
    private DeviceRegistrationRepository repository;

    @Mock
    private DroneClientService droneClientService;

    @Mock
    private DeviceRegistrationMapper mapper;

    @InjectMocks
    private DeviceRegistrationServiceImpl service;

    @Test
    @DisplayName("sweepExpiredDevices marks devices unseen for >30s as OFFLINE while keeping fresh ones ONLINE")
    void sweepExpiredDevices_marksStaleDevicesOffline() {
        DeviceRegistration stale = DeviceRegistration.builder()
                .id("dev-1")
                .deviceIdentifier("DEV-STALE-01")
                .connectionStatus(DeviceConnectionStatus.ONLINE)
                .lastSeenAt(ZonedDateTime.now().minusSeconds(45))
                .build();
        DeviceRegistration fresh = DeviceRegistration.builder()
                .id("dev-2")
                .deviceIdentifier("DEV-FRESH-02")
                .connectionStatus(DeviceConnectionStatus.ONLINE)
                .lastSeenAt(ZonedDateTime.now().minusSeconds(5))
                .build();

        when(repository.findByConnectionStatus(DeviceConnectionStatus.ONLINE)).thenReturn(List.of(stale, fresh));

        service.sweepExpiredDevices();

        assertThat(stale.getConnectionStatus()).isEqualTo(DeviceConnectionStatus.OFFLINE);
        assertThat(fresh.getConnectionStatus()).isEqualTo(DeviceConnectionStatus.ONLINE);
        verify(repository).saveAll(anyList());
    }

    @Test
    @DisplayName("processHeartbeat resolves lowercase device identifiers case-insensitively")
    void processHeartbeat_lowercaseIdentifier_resolvesUppercaseRecord() {
        DeviceRegistration reg = DeviceRegistration.builder()
                .id("dev-1")
                .deviceIdentifier("DEV-UPPER-01")
                .connectionStatus(DeviceConnectionStatus.OFFLINE)
                .build();

        when(repository.findById("dev-upper-01")).thenReturn(Optional.empty());
        when(repository.findByDroneIdAndRegistrationStatusNot("dev-upper-01", DeviceRegistrationStatus.REVOKED))
                .thenReturn(Optional.empty());
        when(repository.findByDeviceIdentifierIgnoreCaseAndRegistrationStatusNot(
                "dev-upper-01", DeviceRegistrationStatus.REVOKED))
                .thenReturn(Optional.of(reg));

        var result = service.processHeartbeat("dev-upper-01", new DeviceHeartbeatPostVm("sock-1"));

        assertThat(result.success()).isTrue();
        assertThat(reg.getConnectionStatus()).isEqualTo(DeviceConnectionStatus.ONLINE);
        verify(repository).save(reg);
    }
}
