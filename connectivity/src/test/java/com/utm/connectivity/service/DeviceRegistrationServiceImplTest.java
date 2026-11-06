package com.utm.connectivity.service;

import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.connectivity.mapper.DeviceRegistrationMapper;
import com.utm.connectivity.model.DeviceRegistration;
import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import com.utm.connectivity.repository.DeviceRegistrationRepository;
import com.utm.connectivity.service.client.DroneClientService;
import com.utm.connectivity.viewmodel.client.DroneBriefVm;
import com.utm.connectivity.viewmodel.device.DeviceHeartbeatPostVm;
import com.utm.connectivity.viewmodel.device.DeviceRegistrationListVm;
import com.utm.connectivity.viewmodel.device.DeviceRegistrationPostVm;
import com.utm.connectivity.viewmodel.device.DeviceRegistrationVm;
import com.utm.connectivity.viewmodel.device.HeartbeatResultVm;
import com.utm.connectivity.viewmodel.device.RevokeResultVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SuppressWarnings("unchecked")
@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: DeviceRegistrationServiceImpl (Based on docs/api/05-connectivity.md)")
class DeviceRegistrationServiceImplTest {

        @Mock
        private DeviceRegistrationRepository deviceRegistrationRepository;

        @Mock
        private DroneClientService droneClientService;

        @Mock
        private DeviceRegistrationMapper mapper;

        @InjectMocks
        private DeviceRegistrationServiceImpl deviceRegistrationService;

        private DeviceRegistration testRegistration;
        private DeviceRegistrationVm testRegistrationVm;
        private DeviceRegistrationPostVm testPostVm;
        private DroneBriefVm testDrone;

        @BeforeEach
        void setUp() {
                testDrone = new DroneBriefVm(
                                "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "VN-UAV-001",
                                "DJI",
                                "Matrice 350 RTK",
                                "available");

                testRegistration = DeviceRegistration.builder()
                                .id("c1b2c3d4-e5f6-7890-abcd-ef1234567890")
                                .droneId("d1b2c3d4-e5f6-7890-abcd-ef1234567890")
                                .deviceIdentifier("DRONE-MAC-9876543210AB")
                                .connectionStatus(DeviceConnectionStatus.OFFLINE)
                                .certificateFingerprint("SHA256:7b91d24c88f910a3")
                                .socketId("ws-session-xyz-123")
                                .lastSeenAt(ZonedDateTime.now())
                                .build();

                testRegistrationVm = new DeviceRegistrationVm(
                                "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "VN-UAV-001",
                                "Matrice 350 RTK",
                                "DRONE-MAC-9876543210AB",
                                DeviceConnectionStatus.OFFLINE,
                                "ws-session-xyz-123",
                                "SHA256:7b91d24c88f910a3",
                                ZonedDateTime.now(),
                                ZonedDateTime.now(),
                                ZonedDateTime.now());

                testPostVm = new DeviceRegistrationPostVm(
                                "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "DRONE-MAC-9876543210AB",
                                "SHA256:7b91d24c88f910a3");
        }

        @Nested
        @DisplayName("Endpoint: POST /api/v1/connectivity/devices/register (Register Hardware Device)")
        class RegisterDeviceTests {

                @Test
                @DisplayName("Should successfully pair hardware device with drone and return 201 Created ViewModel")
                void registerDevice_validInput_savesAndReturnsExpectedVm() {
                        when(droneClientService.getDroneById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .thenReturn(Optional.of(testDrone));
                        when(deviceRegistrationRepository.findByDroneId("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .thenReturn(Optional.empty());
                        when(deviceRegistrationRepository.findByDeviceIdentifier("DRONE-MAC-9876543210AB"))
                                        .thenReturn(Optional.empty());
                        when(mapper.toEntity(testPostVm)).thenReturn(testRegistration);
                        when(deviceRegistrationRepository.save(testRegistration)).thenReturn(testRegistration);
                        when(mapper.toVm(testRegistration, testDrone)).thenReturn(testRegistrationVm);

                        DeviceRegistrationVm result = deviceRegistrationService.registerDevice(testPostVm);

                        assertThat(result).isNotNull();
                        assertThat(result.id()).isEqualTo("c1b2c3d4-e5f6-7890-abcd-ef1234567890");
                        assertThat(result.droneId()).isEqualTo("d1b2c3d4-e5f6-7890-abcd-ef1234567890");
                        assertThat(result.deviceIdentifier()).isEqualTo("DRONE-MAC-9876543210AB");
                        assertThat(result.connectionStatus()).isEqualTo(DeviceConnectionStatus.OFFLINE);
                        assertThat(result.droneRegistrationNumber()).isEqualTo("VN-UAV-001");
                        assertThat(result.droneModel()).isEqualTo("Matrice 350 RTK");
                        assertThat(result.certificateFingerprint()).isEqualTo("SHA256:7b91d24c88f910a3");

                        verify(droneClientService).getDroneById("d1b2c3d4-e5f6-7890-abcd-ef1234567890");
                        verify(deviceRegistrationRepository).findByDroneId("d1b2c3d4-e5f6-7890-abcd-ef1234567890");
                        verify(deviceRegistrationRepository).findByDeviceIdentifier("DRONE-MAC-9876543210AB");
                        verify(deviceRegistrationRepository).save(testRegistration);
                }

                @Test
                @DisplayName("Should throw NotFoundException (404) when target drone does not exist")
                void registerDevice_droneNotFound_throwsNotFoundException() {
                        when(droneClientService.getDroneById("non-existent-drone")).thenReturn(Optional.empty());

                        DeviceRegistrationPostVm postVm = new DeviceRegistrationPostVm("non-existent-drone",
                                        "DRONE-MAC-01", null);

                        assertThatThrownBy(() -> deviceRegistrationService.registerDevice(postVm))
                                        .isInstanceOf(NotFoundException.class)
                                        .hasMessageContaining("non-existent-drone");

                        verify(deviceRegistrationRepository, never()).save(any());
                }

                @Test
                @DisplayName("Should throw DuplicatedException (409) when target drone already has paired hardware")
                void registerDevice_droneAlreadyRegistered_throwsDuplicatedException() {
                        when(droneClientService.getDroneById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .thenReturn(Optional.of(testDrone));
                        when(deviceRegistrationRepository.findByDroneId("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .thenReturn(Optional.of(testRegistration));

                        assertThatThrownBy(() -> deviceRegistrationService.registerDevice(testPostVm))
                                        .isInstanceOf(DuplicatedException.class)
                                        .hasMessageContaining("d1b2c3d4-e5f6-7890-abcd-ef1234567890");

                        verify(deviceRegistrationRepository, never()).findByDeviceIdentifier(any());
                        verify(deviceRegistrationRepository, never()).save(any());
                }

                @Test
                @DisplayName("Should throw DuplicatedException (409) when device identifier is already registered to another drone")
                void registerDevice_deviceIdentifierAlreadyExists_throwsDuplicatedException() {
                        when(droneClientService.getDroneById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .thenReturn(Optional.of(testDrone));
                        when(deviceRegistrationRepository.findByDroneId("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .thenReturn(Optional.empty());
                        when(deviceRegistrationRepository.findByDeviceIdentifier("DRONE-MAC-9876543210AB"))
                                        .thenReturn(Optional.of(testRegistration));

                        assertThatThrownBy(() -> deviceRegistrationService.registerDevice(testPostVm))
                                        .isInstanceOf(DuplicatedException.class)
                                        .hasMessageContaining("DRONE-MAC-9876543210AB");

                        verify(deviceRegistrationRepository, never()).save(any());
                }
        }

        @Nested
        @DisplayName("Endpoint: GET /api/v1/connectivity/devices (List Devices)")
        class GetDevicesTests {

                @Test
                @DisplayName("Should return paginated and filtered list of device registrations")
                void getDevices_withStatusAndSearch_returnsFilteredList() {
                        Page<DeviceRegistration> page = new PageImpl<>(List.of(testRegistration));
                        when(deviceRegistrationRepository.findAll(any(Specification.class), any(Pageable.class)))
                                        .thenReturn(page);
                        when(droneClientService.getDroneById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .thenReturn(Optional.of(testDrone));
                        when(mapper.toVm(testRegistration, testDrone)).thenReturn(testRegistrationVm);

                        DeviceRegistrationListVm result = deviceRegistrationService
                                        .getDevices(DeviceConnectionStatus.OFFLINE, "987654", 20, 0);

                        assertThat(result).isNotNull();
                        assertThat(result.total()).isEqualTo(1);
                        assertThat(result.items()).hasSize(1);
                        assertThat(result.items().get(0).deviceIdentifier()).isEqualTo("DRONE-MAC-9876543210AB");
                        assertThat(result.items().get(0).connectionStatus()).isEqualTo(DeviceConnectionStatus.OFFLINE);

                        verify(deviceRegistrationRepository).findAll(any(Specification.class), any(Pageable.class));
                }

                @Test
                @DisplayName("Should return unpaged list when limit is zero or negative")
                void getDevices_unpagedLimitZero_returnsAllItems() {
                        when(deviceRegistrationRepository.findAll(any(Specification.class), any(Sort.class)))
                                        .thenReturn(List.of(testRegistration));
                        when(droneClientService.getDroneById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .thenReturn(Optional.of(testDrone));
                        when(mapper.toVm(testRegistration, testDrone)).thenReturn(testRegistrationVm);

                        DeviceRegistrationListVm result = deviceRegistrationService.getDevices(null, null, 0, 0);

                        assertThat(result).isNotNull();
                        assertThat(result.total()).isEqualTo(1);
                        assertThat(result.items()).hasSize(1);

                        verify(deviceRegistrationRepository).findAll(any(Specification.class), any(Sort.class));
                }
        }

        @Nested
        @DisplayName("Endpoint: GET /api/v1/connectivity/devices/online (Deadman Switch Online Devices)")
        class GetOnlineDevicesTests {

                @Test
                @DisplayName("Should detect timed-out devices, prune status to OFFLINE, and return only active online devices")
                void getOnlineDevices_prunesTimedOutDevicesAndReturnsActive() {
                        DeviceRegistration staleOnlineDevice = DeviceRegistration.builder()
                                        .id("c2-stale")
                                        .droneId("d2")
                                        .deviceIdentifier("DRONE-MAC-STALE")
                                        .connectionStatus(DeviceConnectionStatus.ONLINE)
                                        .lastSeenAt(ZonedDateTime.now().minusSeconds(45))
                                        .build();

                        DeviceRegistration activeOnlineDevice = DeviceRegistration.builder()
                                        .id("c1-active")
                                        .droneId("d1b2c3d4-e5f6-7890-abcd-ef1234567890")
                                        .deviceIdentifier("DRONE-MAC-ACTIVE")
                                        .connectionStatus(DeviceConnectionStatus.ONLINE)
                                        .lastSeenAt(ZonedDateTime.now().minusSeconds(5))
                                        .build();

                        DeviceRegistrationVm activeVm = new DeviceRegistrationVm(
                                        "c1-active", "d1b2c3d4-e5f6-7890-abcd-ef1234567890", "VN-UAV-001",
                                        "Matrice 350 RTK",
                                        "DRONE-MAC-ACTIVE", DeviceConnectionStatus.ONLINE, "ws-1", null,
                                        ZonedDateTime.now(),
                                        ZonedDateTime.now(), ZonedDateTime.now());

                        when(deviceRegistrationRepository.findByConnectionStatus(DeviceConnectionStatus.ONLINE))
                                        .thenReturn(List.of(staleOnlineDevice, activeOnlineDevice))
                                        .thenReturn(List.of(activeOnlineDevice));
                        when(droneClientService.getDroneById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .thenReturn(Optional.of(testDrone));
                        when(mapper.toVm(activeOnlineDevice, testDrone)).thenReturn(activeVm);

                        List<DeviceRegistrationVm> result = deviceRegistrationService.getOnlineDevices();

                        assertThat(result).hasSize(1);
                        assertThat(result.get(0).connectionStatus()).isEqualTo(DeviceConnectionStatus.ONLINE);
                        assertThat(result.get(0).deviceIdentifier()).isEqualTo("DRONE-MAC-ACTIVE");

                        assertThat(staleOnlineDevice.getConnectionStatus()).isEqualTo(DeviceConnectionStatus.OFFLINE);
                        verify(deviceRegistrationRepository).save(staleOnlineDevice);
                }
        }

        @Nested
        @DisplayName("Endpoint: GET /api/v1/connectivity/devices/{id} (Flexible Lookup)")
        class GetDeviceByIdTests {

                @Test
                @DisplayName("Should return device registration profile using flexible lookup by id, identifier, or droneId")
                void getDeviceById_existingKey_returnsExpectedVm() {
                        when(deviceRegistrationRepository.findByIdOrDeviceIdentifierOrDroneId("DRONE-MAC-9876543210AB",
                                        "DRONE-MAC-9876543210AB", "DRONE-MAC-9876543210AB"))
                                        .thenReturn(Optional.of(testRegistration));
                        when(droneClientService.getDroneById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .thenReturn(Optional.of(testDrone));
                        when(mapper.toVm(testRegistration, testDrone)).thenReturn(testRegistrationVm);

                        DeviceRegistrationVm result = deviceRegistrationService.getDeviceById("DRONE-MAC-9876543210AB");

                        assertThat(result).isNotNull();
                        assertThat(result.id()).isEqualTo("c1b2c3d4-e5f6-7890-abcd-ef1234567890");
                        assertThat(result.deviceIdentifier()).isEqualTo("DRONE-MAC-9876543210AB");
                        assertThat(result.droneRegistrationNumber()).isEqualTo("VN-UAV-001");
                        assertThat(result.droneModel()).isEqualTo("Matrice 350 RTK");

                        verify(deviceRegistrationRepository).findByIdOrDeviceIdentifierOrDroneId(
                                        "DRONE-MAC-9876543210AB", "DRONE-MAC-9876543210AB", "DRONE-MAC-9876543210AB");
                }

                @Test
                @DisplayName("Should throw NotFoundException (404) when lookup key does not exist")
                void getDeviceById_nonExistentKey_throwsNotFoundException() {
                        when(deviceRegistrationRepository.findByIdOrDeviceIdentifierOrDroneId("unknown-key",
                                        "unknown-key", "unknown-key"))
                                        .thenReturn(Optional.empty());

                        assertThatThrownBy(() -> deviceRegistrationService.getDeviceById("unknown-key"))
                                        .isInstanceOf(NotFoundException.class)
                                        .hasMessageContaining("unknown-key");

                        verify(mapper, never()).toVm(any(), any());
                }
        }

        @Nested
        @DisplayName("Endpoint: POST /api/v1/connectivity/devices/{id}/heartbeat (Process Heartbeat)")
        class ProcessHeartbeatTests {

                @Test
                @DisplayName("Should update status to ONLINE, record lastSeenAt and socketId, and return success result")
                void processHeartbeat_existingDevice_updatesOnlineStatusAndReturnsSuccess() {
                        when(deviceRegistrationRepository.findByIdOrDeviceIdentifierOrDroneId(
                                        "c1b2c3d4-e5f6-7890-abcd-ef1234567890", "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                        "c1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .thenReturn(Optional.of(testRegistration));
                        when(deviceRegistrationRepository.save(testRegistration)).thenReturn(testRegistration);

                        DeviceHeartbeatPostVm heartbeatVm = new DeviceHeartbeatPostVm("ws-session-new-456");

                        HeartbeatResultVm result = deviceRegistrationService
                                        .processHeartbeat("c1b2c3d4-e5f6-7890-abcd-ef1234567890", heartbeatVm);

                        assertThat(result).isNotNull();
                        assertThat(result.success()).isTrue();
                        assertThat(result.timestamp()).isNotNull();

                        assertThat(testRegistration.getConnectionStatus()).isEqualTo(DeviceConnectionStatus.ONLINE);
                        assertThat(testRegistration.getSocketId()).isEqualTo("ws-session-new-456");
                        assertThat(testRegistration.getLastSeenAt()).isNotNull();

                        verify(deviceRegistrationRepository).save(testRegistration);
                }

                @Test
                @DisplayName("Should throw NotFoundException (404) when heartbeat device identifier is not registered")
                void processHeartbeat_nonExistentDevice_throwsNotFoundException() {
                        when(deviceRegistrationRepository.findByIdOrDeviceIdentifierOrDroneId("unknown", "unknown",
                                        "unknown"))
                                        .thenReturn(Optional.empty());

                        assertThatThrownBy(() -> deviceRegistrationService.processHeartbeat("unknown", null))
                                        .isInstanceOf(NotFoundException.class)
                                        .hasMessageContaining("unknown");

                        verify(deviceRegistrationRepository, never()).save(any());
                }
        }

        @Nested
        @DisplayName("Endpoint: DELETE /api/v1/connectivity/devices/{id} (Revoke Device Registration)")
        class RevokeDeviceRegistrationTests {

                @Test
                @DisplayName("Should revoke device registration successfully when drone is not currently flying")
                void revokeDeviceRegistration_existingDeviceAndDroneAvailable_deletesAndReturnsSuccess() {
                        when(deviceRegistrationRepository.findByIdOrDeviceIdentifierOrDroneId(
                                        "c1b2c3d4-e5f6-7890-abcd-ef1234567890", "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                        "c1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .thenReturn(Optional.of(testRegistration));
                        when(droneClientService.getDroneById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .thenReturn(Optional.of(testDrone));

                        RevokeResultVm result = deviceRegistrationService
                                        .revokeDeviceRegistration("c1b2c3d4-e5f6-7890-abcd-ef1234567890");

                        assertThat(result).isNotNull();
                        assertThat(result.message()).isEqualTo("Device registration revoked successfully");

                        verify(deviceRegistrationRepository).delete(testRegistration);
                }

                @Test
                @DisplayName("Should throw BadRequestException (400) when drone is in_flight")
                void revokeDeviceRegistration_droneInFlight_throwsBadRequestException() {
                        DroneBriefVm flyingDrone = new DroneBriefVm(
                                        "d1b2c3d4-e5f6-7890-abcd-ef1234567890", "VN-UAV-001", "DJI", "Matrice 350 RTK",
                                        "in_flight");

                        when(deviceRegistrationRepository.findByIdOrDeviceIdentifierOrDroneId(
                                        "c1b2c3d4-e5f6-7890-abcd-ef1234567890", "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                        "c1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .thenReturn(Optional.of(testRegistration));
                        when(droneClientService.getDroneById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .thenReturn(Optional.of(flyingDrone));

                        assertThatThrownBy(() -> deviceRegistrationService
                                        .revokeDeviceRegistration("c1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .isInstanceOf(BadRequestException.class)
                                        .hasMessageContaining("d1b2c3d4-e5f6-7890-abcd-ef1234567890");

                        verify(deviceRegistrationRepository, never()).delete(any(DeviceRegistration.class));
                }

                @Test
                @DisplayName("Should throw BadRequestException (400) when drone is in_mission")
                void revokeDeviceRegistration_droneInMission_throwsBadRequestException() {
                        DroneBriefVm missionDrone = new DroneBriefVm(
                                        "d1b2c3d4-e5f6-7890-abcd-ef1234567890", "VN-UAV-001", "DJI", "Matrice 350 RTK",
                                        "in_mission");

                        when(deviceRegistrationRepository.findByIdOrDeviceIdentifierOrDroneId(
                                        "c1b2c3d4-e5f6-7890-abcd-ef1234567890", "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                        "c1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .thenReturn(Optional.of(testRegistration));
                        when(droneClientService.getDroneById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .thenReturn(Optional.of(missionDrone));

                        assertThatThrownBy(() -> deviceRegistrationService
                                        .revokeDeviceRegistration("c1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                        .isInstanceOf(BadRequestException.class)
                                        .hasMessageContaining("d1b2c3d4-e5f6-7890-abcd-ef1234567890");

                        verify(deviceRegistrationRepository, never()).delete(any(DeviceRegistration.class));
                }

                @Test
                @DisplayName("Should throw NotFoundException (404) when target device registration does not exist")
                void revokeDeviceRegistration_nonExistentDevice_throwsNotFoundException() {
                        when(deviceRegistrationRepository.findByIdOrDeviceIdentifierOrDroneId("non-existent-id",
                                        "non-existent-id", "non-existent-id"))
                                        .thenReturn(Optional.empty());

                        assertThatThrownBy(() -> deviceRegistrationService.revokeDeviceRegistration("non-existent-id"))
                                        .isInstanceOf(NotFoundException.class)
                                        .hasMessageContaining("non-existent-id");

                        verify(deviceRegistrationRepository, never()).delete(any(DeviceRegistration.class));
                }
        }
}
