package com.utm.connectivity.controller;

import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import com.utm.connectivity.service.DeviceRegistrationService;
import com.utm.connectivity.viewmodel.DeviceHeartbeatPostVm;
import com.utm.connectivity.viewmodel.DeviceRegistrationPostVm;
import com.utm.connectivity.viewmodel.DeviceRegistrationVm;
import com.utm.connectivity.viewmodel.HeartbeatResultVm;
import com.utm.connectivity.viewmodel.RevokeResultVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/connectivity")
@RequiredArgsConstructor
@Tag(name = "Connectivity & Device Registration", description = "Endpoints for managing hardware device registrations, telemetry connectivity, and heartbeats")
public class DeviceRegistrationController {

    private final DeviceRegistrationService deviceRegistrationService;

    @PostMapping("/devices/register")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register drone hardware device", description = "Associates a unique hardware device identifier with a drone in a 1-to-1 relationship")
    public ResponseEntity<DeviceRegistrationVm> registerDevice(@Valid @RequestBody DeviceRegistrationPostVm postVm) {
        DeviceRegistrationVm result = deviceRegistrationService.registerDevice(postVm);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/devices")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator')")
    @Operation(summary = "List registered devices", description = "Returns a paginated list of registered devices with optional connection status filter")
    public ResponseEntity<Page<DeviceRegistrationVm>> getDevices(
            @RequestParam(name = "connectionStatus", required = false) DeviceConnectionStatus connectionStatus,
            @PageableDefault(size = 20, sort = "createdOn", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<DeviceRegistrationVm> result = deviceRegistrationService.getDevices(connectionStatus, pageable);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/devices/online")
    @Operation(summary = "List currently online devices", description = "Returns list of active online devices, applying automatic deadman-switch timeout pruning (30s threshold)")
    public ResponseEntity<List<DeviceRegistrationVm>> getOnlineDevices() {
        List<DeviceRegistrationVm> result = deviceRegistrationService.getOnlineDevices();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/devices/{id}")
    @Operation(summary = "Get device details by ID", description = "Returns detailed profile of a device registration including drone specifications")
    public ResponseEntity<DeviceRegistrationVm> getDeviceById(@PathVariable("id") String id) {
        DeviceRegistrationVm result = deviceRegistrationService.getDeviceById(id);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/devices/{id}/heartbeat")
    @Operation(summary = "Send device heartbeat ping", description = "Heartbeat signal sent periodically by IoT hardware/gateway to maintain online presence")
    public ResponseEntity<HeartbeatResultVm> processHeartbeat(
            @PathVariable("id") String id,
            @RequestBody(required = false) DeviceHeartbeatPostVm heartbeatVm
    ) {
        HeartbeatResultVm result = deviceRegistrationService.processHeartbeat(id, heartbeatVm);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/devices/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Revoke device registration", description = "Removes hardware device registration. Rejected if the drone is actively in flight")
    public ResponseEntity<RevokeResultVm> revokeDeviceRegistration(@PathVariable("id") String id) {
        RevokeResultVm result = deviceRegistrationService.revokeDeviceRegistration(id);
        return ResponseEntity.ok(result);
    }
}
