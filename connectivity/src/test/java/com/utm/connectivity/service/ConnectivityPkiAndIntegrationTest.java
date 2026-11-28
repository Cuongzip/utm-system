package com.utm.connectivity.service;

import com.utm.commonlibrary.exception.AccessDeniedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.kafka.event.DroneCommandEvent;
import com.utm.connectivity.model.DeviceCertificate;
import com.utm.connectivity.model.DeviceRegistration;
import com.utm.connectivity.model.ManufacturerApiKey;
import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import com.utm.connectivity.model.enumeration.DeviceRegistrationStatus;
import com.utm.connectivity.model.enumeration.DeviceType;
import com.utm.connectivity.model.enumeration.TelemetryMode;
import com.utm.connectivity.repository.DeviceCertificateRepository;
import com.utm.connectivity.repository.DeviceRegistrationRepository;
import com.utm.connectivity.repository.ManufacturerApiKeyRepository;
import com.utm.connectivity.service.client.DroneClientService;
import com.utm.connectivity.service.client.TelemetryClientService;
import com.utm.connectivity.viewmodel.certificate.CaCertificateVm;
import com.utm.connectivity.viewmodel.certificate.DeviceCertificateBundleVm;
import com.utm.connectivity.viewmodel.client.DroneBriefVm;
import com.utm.connectivity.viewmodel.integration.IntegrationTelemetryPostVm;
import com.utm.connectivity.viewmodel.integration.IntegrationTelemetryResultVm;
import com.utm.connectivity.viewmodel.integration.ManufacturerApiKeyCreatedVm;
import com.utm.connectivity.viewmodel.integration.ManufacturerApiKeyPostVm;
import com.utm.connectivity.viewmodel.stats.CommandStatsVm;
import com.utm.connectivity.viewmodel.telemetry.DeviceTelemetryModeVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: Connectivity PKI, Adaptive Rate, Command Router & OEM Integration")
class ConnectivityPkiAndIntegrationTest {

    @Mock
    private DeviceRegistrationService deviceRegistrationService;

    @Mock
    private DeviceRegistrationRepository deviceRegistrationRepository;

    @Mock
    private DeviceCertificateRepository certificateRepository;

    @Mock
    private ManufacturerApiKeyRepository apiKeyRepository;

    @Mock
    private DroneClientService droneClientService;

    @Mock
    private TelemetryClientService telemetryClientService;

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    private CertificateServiceImpl certificateService;
    private AdaptiveRateServiceImpl adaptiveRateService;
    private CommandRouterServiceImpl commandRouterService;
    private IntegrationServiceImpl integrationService;
    private DeviceRegistration sampleDevice;

    @BeforeEach
    void setUp() {
        certificateService = new CertificateServiceImpl(
                deviceRegistrationService, deviceRegistrationRepository, certificateRepository);
        certificateService.initializeRootCa();

        adaptiveRateService = new AdaptiveRateServiceImpl(
                deviceRegistrationService, deviceRegistrationRepository);

        commandRouterService = new CommandRouterServiceImpl(
                deviceRegistrationRepository, adaptiveRateService, kafkaTemplate, "utm.drone.command.acks");

        integrationService = new IntegrationServiceImpl(
                apiKeyRepository, deviceRegistrationRepository, droneClientService, telemetryClientService);

        sampleDevice = DeviceRegistration.builder()
                .id("dev-001")
                .deviceType(DeviceType.DRONE)
                .droneId("drone-001")
                .deviceIdentifier("DRONE-VN-UAV-001")
                .registrationStatus(DeviceRegistrationStatus.ACTIVE)
                .connectionStatus(DeviceConnectionStatus.ONLINE)
                .telemetryMode(TelemetryMode.NORMAL)
                .supportedProtocols(List.of("websocket"))
                .build();
    }

    @Test
    @DisplayName("Should initialize RSA-2048 Root CA and sign 90-day X.509 v3 device certificate")
    void issueDeviceCertificate_validDevice_generatesSignedPemAndFingerprint() {
        when(deviceRegistrationService.requireEntityByKey("dev-001")).thenReturn(sampleDevice);
        when(certificateRepository.findByDeviceRegistrationIdAndRevokedAtIsNull("dev-001")).thenReturn(List.of());
        when(certificateRepository.saveAndFlush(any(DeviceCertificate.class))).thenAnswer(inv -> inv.getArgument(0));

        CaCertificateVm ca = certificateService.getCaCertificate();
        DeviceCertificateBundleVm bundle = certificateService.issueDeviceCertificate("dev-001");

        assertThat(ca.commonName()).isEqualTo("UTM Root CA");
        assertThat(ca.caCertificatePem()).contains("BEGIN CERTIFICATE");
        assertThat(bundle.certificatePem()).contains("BEGIN CERTIFICATE");
        assertThat(bundle.privateKeyPem()).contains("PRIVATE KEY");
        assertThat(bundle.commonName()).isEqualTo("DRONE-VN-UAV-001");
        assertThat(bundle.fingerprint()).hasSize(64);
    }

    @Test
    @DisplayName("Should update device telemetry mode to EMERGENCY with 10 Hz rate")
    void setDeviceTelemetryMode_emergencyMode_returns10HzConfiguration() {
        when(deviceRegistrationService.requireEntityByKey("dev-001")).thenReturn(sampleDevice);
        when(deviceRegistrationRepository.save(sampleDevice)).thenReturn(sampleDevice);

        DeviceTelemetryModeVm vm = adaptiveRateService.setDeviceTelemetryMode(
                "dev-001", TelemetryMode.EMERGENCY, "Battery critical");

        assertThat(vm.telemetryMode()).isEqualTo(TelemetryMode.EMERGENCY);
        assertThat(vm.rateHz()).isEqualTo(10.0);
        assertThat(vm.intervalMs()).isEqualTo(100);
    }

    @Test
    @DisplayName("Should return current device telemetry mode with rate configuration and audit timestamp")
    void getDeviceTelemetryMode_existingDevice_returnsCurrentModeAndConfig() {
        ZonedDateTime createdAt = ZonedDateTime.parse("2026-11-27T06:00:00Z");
        ZonedDateTime modifiedAt = ZonedDateTime.parse("2026-11-27T07:15:00Z");
        sampleDevice.setTelemetryMode(TelemetryMode.ENHANCED);
        sampleDevice.setTelemetryModeReason("Terminal approach corridor");
        sampleDevice.setCreatedOn(createdAt);
        sampleDevice.setLastModifiedOn(modifiedAt);
        when(deviceRegistrationService.requireEntityByKey("drone-001")).thenReturn(sampleDevice);

        DeviceTelemetryModeVm vm = adaptiveRateService.getDeviceTelemetryMode("drone-001");

        assertThat(vm.deviceId()).isEqualTo("dev-001");
        assertThat(vm.deviceIdentifier()).isEqualTo("DRONE-VN-UAV-001");
        assertThat(vm.droneId()).isEqualTo("drone-001");
        assertThat(vm.telemetryMode()).isEqualTo(TelemetryMode.ENHANCED);
        assertThat(vm.telemetryModeReason()).isEqualTo("Terminal approach corridor");
        assertThat(vm.rateHz()).isEqualTo(2.0);
        assertThat(vm.intervalMs()).isEqualTo(500);
        assertThat(vm.updatedAt()).isEqualTo(modifiedAt);
    }

    @Test
    @DisplayName("Should default to NORMAL mode and createdOn timestamp when telemetryMode and lastModifiedOn are null")
    void getDeviceTelemetryMode_nullModeAndLastModified_defaultsToNormalAndCreatedOn() {
        ZonedDateTime createdAt = ZonedDateTime.parse("2026-11-27T06:00:00Z");
        sampleDevice.setTelemetryMode(null);
        sampleDevice.setTelemetryModeReason(null);
        sampleDevice.setCreatedOn(createdAt);
        sampleDevice.setLastModifiedOn(null);
        when(deviceRegistrationService.requireEntityByKey("dev-001")).thenReturn(sampleDevice);

        DeviceTelemetryModeVm vm = adaptiveRateService.getDeviceTelemetryMode("dev-001");

        assertThat(vm.deviceId()).isEqualTo("dev-001");
        assertThat(vm.telemetryMode()).isEqualTo(TelemetryMode.NORMAL);
        assertThat(vm.rateHz()).isEqualTo(0.5);
        assertThat(vm.intervalMs()).isEqualTo(2000);
        assertThat(vm.updatedAt()).isEqualTo(createdAt);
    }

    @Test
    @DisplayName("Should propagate NotFoundException when getting telemetry mode for unknown device key")
    void getDeviceTelemetryMode_unknownDevice_throwsNotFoundException() {
        when(deviceRegistrationService.requireEntityByKey("missing-dev"))
                .thenThrow(new NotFoundException("DEVICE_NOT_FOUND", "id", "missing-dev"));

        assertThatThrownBy(() -> adaptiveRateService.getDeviceTelemetryMode("missing-dev"))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("Should route P0 emergency_stop command to online device and emit ACK event")
    void routeCommand_onlineDeviceEmergencyStop_routesPriorityZeroAndPublishesAck() {
        when(deviceRegistrationRepository.findByDroneIdAndRegistrationStatusNot(
                "drone-001", DeviceRegistrationStatus.REVOKED)).thenReturn(Optional.of(sampleDevice));

        DroneCommandEvent cmd = new DroneCommandEvent(
                "cmd-001", "drone-001", "flt-001", "emergency_stop", null, null, "pending", ZonedDateTime.now());
        commandRouterService.routeCommand(cmd);

        CommandStatsVm stats = commandRouterService.getCommandStats();
        assertThat(stats.totalRouted()).isEqualTo(1L);
        assertThat(stats.byPriority().get(0)).isEqualTo(1L);
        verify(kafkaTemplate, org.mockito.Mockito.atLeastOnce()).send(eq("utm.drone.command.acks"), eq("drone-001"), any());
    }

    @Test
    @DisplayName("Should hash API key on creation and validate X-API-Key scope during OEM telemetry ingestion")
    void createAndIngestOemTelemetry_validApiKey_forwardsTelemetryAndUpdatesDevice() {
        when(apiKeyRepository.saveAndFlush(any(ManufacturerApiKey.class))).thenAnswer(inv -> {
            ManufacturerApiKey k = inv.getArgument(0);
            k.setId("key-001");
            return k;
        });

        ManufacturerApiKeyCreatedVm created = integrationService.createApiKey(
                new ManufacturerApiKeyPostVm("DJI Bridge", "DJI", null, 30, null));
        String rawKey = created.apiKey();
        String expectedHash = IntegrationServiceImpl.sha256Hex(rawKey);

        ManufacturerApiKey stored = ManufacturerApiKey.builder()
                .id("key-001")
                .name("DJI Bridge")
                .manufacturerName("DJI")
                .keyPrefix(rawKey.substring(0, 14))
                .keyHash(expectedHash)
                .scopes(List.of("telemetry:write"))
                .isActive(true)
                .build();

        when(apiKeyRepository.findByKeyHash(expectedHash)).thenReturn(Optional.of(stored));
        when(droneClientService.getDroneById("drone-001")).thenReturn(Optional.of(
                new DroneBriefVm("drone-001", "VN-UAV-001", "DJI", "Matrice 350", "in_flight")));
        when(deviceRegistrationRepository.findByDroneIdAndRegistrationStatusNot(
                "drone-001", DeviceRegistrationStatus.REVOKED)).thenReturn(Optional.of(sampleDevice));

        IntegrationTelemetryResultVm res = integrationService.ingestManufacturerTelemetry(
                rawKey,
                new IntegrationTelemetryPostVm(
                        "drone-001", "flt-001", 10.7769, 106.7009, 80.0,
                        90.0, 14.0, 82.0, 0.0, 0.0, 90.0, 95.0, "AUTO", true, null));

        assertThat(res.success()).isTrue();
        assertThat(res.droneId()).isEqualTo("drone-001");
        assertThat(res.deviceId()).isEqualTo("dev-001");
        var captor = org.mockito.ArgumentCaptor.forClass(com.utm.connectivity.viewmodel.client.TelemetryIngestClientVm.class);
        verify(telemetryClientService).forwardTelemetry(captor.capture());
        assertThat(captor.getValue().signalStrength()).isEqualTo(95.0);
        assertThat(captor.getValue().flightMode()).isEqualTo("AUTO");
        assertThat(captor.getValue().source()).isEqualTo("oem_api");
    }

    @Test
    @DisplayName("Should reject OEM telemetry when X-API-Key is missing or invalid")
    void ingestManufacturerTelemetry_invalidKey_throwsAccessDeniedException() {
        IntegrationTelemetryPostVm payload = new IntegrationTelemetryPostVm(
                "drone-001", null, 10.77, 106.70, 50.0, null, null, 90.0,
                null, null, null, null, null, null, null);

        assertThatThrownBy(() -> integrationService.ingestManufacturerTelemetry("", payload))
                .isInstanceOf(AccessDeniedException.class);
    }
}
