package com.utm.connectivity.controller;

import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import com.utm.connectivity.service.AdaptiveRateService;
import com.utm.connectivity.service.CertificateService;
import com.utm.connectivity.service.CommandRouterService;
import com.utm.connectivity.service.DeviceRegistrationService;
import com.utm.connectivity.viewmodel.certificate.CaCertificateVm;
import com.utm.connectivity.viewmodel.certificate.DeviceCertificateBundleVm;
import com.utm.connectivity.viewmodel.certificate.DeviceCertificateVm;
import com.utm.connectivity.viewmodel.device.DeviceHeartbeatPostVm;
import com.utm.connectivity.viewmodel.device.DeviceRegistrationListVm;
import com.utm.connectivity.viewmodel.device.DeviceRegistrationPostVm;
import com.utm.connectivity.viewmodel.device.DeviceRegistrationVm;
import com.utm.connectivity.viewmodel.device.HeartbeatResultVm;
import com.utm.connectivity.viewmodel.device.RevokeResultVm;
import com.utm.connectivity.viewmodel.stats.CommandStatsVm;
import com.utm.connectivity.viewmodel.stats.ConnectivityStatusVm;
import com.utm.connectivity.viewmodel.stats.ProtocolStatsVm;
import com.utm.connectivity.viewmodel.telemetry.DeviceTelemetryModeVm;
import com.utm.connectivity.viewmodel.telemetry.TelemetryModeConfigVm;
import com.utm.connectivity.viewmodel.telemetry.TelemetryModePutVm;
import com.utm.connectivity.viewmodel.telemetry.TelemetryRateStatsVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/connectivity")
@RequiredArgsConstructor
@Tag(name = "Connectivity, PKI & Adaptive Telemetry", description = "Device registrations, X.509 PKI certificates, adaptive telemetry rates, and command routing stats")
public class DeviceRegistrationController {

    private final DeviceRegistrationService deviceRegistrationService;
    private final CertificateService certificateService;
    private final AdaptiveRateService adaptiveRateService;
    private final CommandRouterService commandRouterService;

    @PostMapping("/devices/register")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register hardware device (DRONE, GATEWAY, or GCS)")
    public ResponseEntity<DeviceRegistrationVm> registerDevice(@Valid @RequestBody DeviceRegistrationPostVm postVm) {
        return ResponseEntity.status(HttpStatus.CREATED).body(deviceRegistrationService.registerDevice(postVm));
    }

    @GetMapping("/devices")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator')")
    @Operation(summary = "List registered devices")
    public ResponseEntity<DeviceRegistrationListVm> getDevices(
            @Parameter(description = "Filter by connection status") @RequestParam(name = "connectionStatus", required = false) DeviceConnectionStatus connectionStatus,
            @Parameter(description = "Filter by Hub UUID") @RequestParam(name = "hubId", required = false) String hubId,
            @Parameter(description = "Search by identifier or drone ID") @RequestParam(name = "search", required = false) String search,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return ResponseEntity.ok(deviceRegistrationService.getDevices(connectionStatus, hubId, search, limit, offset));
    }

    @GetMapping("/devices/online")
    @Operation(summary = "List currently online devices")
    public ResponseEntity<List<DeviceRegistrationVm>> getOnlineDevices() {
        return ResponseEntity.ok(deviceRegistrationService.getOnlineDevices());
    }

    @GetMapping("/devices/{id}")
    @Operation(summary = "Get device details by ID, identifier, or droneId")
    public ResponseEntity<DeviceRegistrationVm> getDeviceById(
            @PathVariable("id") String id,
            @Parameter(description = "Include cross-service drone summary enrichment") @RequestParam(defaultValue = "true") boolean enrich) {
        return ResponseEntity.ok(deviceRegistrationService.getDeviceById(id, enrich));
    }

    @PostMapping("/devices/{id}/heartbeat")
    @Operation(summary = "Send device heartbeat ping")
    public ResponseEntity<HeartbeatResultVm> processHeartbeat(
            @PathVariable("id") String id,
            @Valid @RequestBody(required = false) DeviceHeartbeatPostVm heartbeatVm) {
        return ResponseEntity.ok(deviceRegistrationService.processHeartbeat(id, heartbeatVm));
    }

    @PostMapping("/devices/{id}/disconnect")
    @Operation(summary = "Mark device immediately offline (graceful disconnect / power-off)")
    public ResponseEntity<HeartbeatResultVm> disconnectDevice(@PathVariable("id") String id) {
        return ResponseEntity.ok(deviceRegistrationService.disconnectDevice(id));
    }

    @DeleteMapping("/devices/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Revoke device registration")
    public ResponseEntity<RevokeResultVm> revokeDeviceRegistration(@PathVariable("id") String id) {
        return ResponseEntity.ok(deviceRegistrationService.revokeDeviceRegistration(id));
    }

    @GetMapping("/ca-certificate")
    @Operation(summary = "Get public UTM Root CA X.509 certificate")
    public ResponseEntity<CaCertificateVm> getCaCertificate() {
        return ResponseEntity.ok(certificateService.getCaCertificate());
    }

    @PostMapping("/devices/{id}/certificate")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator')")
    @Operation(summary = "Issue or rotate 90-day RSA-2048 X.509 device certificate")
    public ResponseEntity<DeviceCertificateBundleVm> issueCertificate(@PathVariable("id") String id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(certificateService.issueDeviceCertificate(id));
    }

    @GetMapping("/devices/{id}/certificate")
    @Operation(summary = "Get active X.509 device certificate metadata")
    public ResponseEntity<DeviceCertificateVm> getDeviceCertificate(@PathVariable("id") String id) {
        return ResponseEntity.ok(certificateService.getDeviceCertificate(id));
    }

    @DeleteMapping("/devices/{id}/certificate")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator')")
    @Operation(summary = "Revoke active X.509 device certificate")
    public ResponseEntity<DeviceCertificateVm> revokeDeviceCertificate(
            @PathVariable("id") String id,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(certificateService.revokeDeviceCertificate(id, reason));
    }

    @GetMapping("/telemetry/modes")
    @Operation(summary = "List supported adaptive telemetry rate modes")
    public ResponseEntity<List<TelemetryModeConfigVm>> getTelemetryModes() {
        return ResponseEntity.ok(adaptiveRateService.getSupportedModes());
    }

    @PutMapping("/devices/{id}/telemetry-mode")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator', 'atc')")
    @Operation(summary = "Update adaptive telemetry rate mode for a device")
    public ResponseEntity<DeviceTelemetryModeVm> setDeviceTelemetryMode(
            @PathVariable("id") String id,
            @Valid @RequestBody TelemetryModePutVm putVm) {
        return ResponseEntity.ok(adaptiveRateService.setDeviceTelemetryMode(id, putVm.mode(), putVm.reason()));
    }

    @GetMapping("/telemetry/stats")
    @Operation(summary = "Get telemetry rate distribution across registered devices")
    public ResponseEntity<TelemetryRateStatsVm> getTelemetryStats() {
        return ResponseEntity.ok(adaptiveRateService.getTelemetryStats());
    }

    @GetMapping("/protocols/stats")
    @Operation(summary = "Get protocol adapter statistics and connected devices")
    public ResponseEntity<ProtocolStatsVm> getProtocolStats() {
        return ResponseEntity.ok(commandRouterService.getProtocolStats());
    }

    @GetMapping("/commands/stats")
    @Operation(summary = "Get command router priority tier statistics")
    public ResponseEntity<CommandStatsVm> getCommandStats() {
        return ResponseEntity.ok(commandRouterService.getCommandStats());
    }

    @GetMapping("/status")
    @Operation(summary = "Get overall connectivity gateway operational status")
    public ResponseEntity<ConnectivityStatusVm> getConnectivityStatus() {
        return ResponseEntity.ok(commandRouterService.getConnectivityStatus());
    }
}
