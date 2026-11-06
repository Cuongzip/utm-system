package com.utm.connectivity.controller;

import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import com.utm.connectivity.service.DeviceRegistrationService;
import com.utm.connectivity.viewmodel.device.DeviceHeartbeatPostVm;
import com.utm.connectivity.viewmodel.device.DeviceRegistrationListVm;
import com.utm.connectivity.viewmodel.device.DeviceRegistrationPostVm;
import com.utm.connectivity.viewmodel.device.DeviceRegistrationVm;
import com.utm.connectivity.viewmodel.device.HeartbeatResultVm;
import com.utm.connectivity.viewmodel.device.RevokeResultVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
    @Operation(summary = "Register drone hardware device", description = "Associates a unique hardware device identifier with a drone in a 1-to-1 relationship. Requires admin or hub_operator role.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Device registered successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = DeviceRegistrationVm.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request payload", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Admin or hub_operator role required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Drone not found", content = @Content),
            @ApiResponse(responseCode = "409", description = "Conflict - Drone already registered or device identifier already in use", content = @Content)
    })
    public ResponseEntity<DeviceRegistrationVm> registerDevice(@Valid @RequestBody DeviceRegistrationPostVm postVm) {
        DeviceRegistrationVm result = deviceRegistrationService.registerDevice(postVm);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/devices")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator')")
    @Operation(summary = "List registered devices", description = "Retrieve a paginated and filtered list of registered devices in the UTM system. Requires admin or hub_operator role.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Devices retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = DeviceRegistrationListVm.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Admin or hub_operator role required", content = @Content)
    })
    public ResponseEntity<DeviceRegistrationListVm> getDevices(
            @Parameter(description = "Filter by device connection status (online, offline, connecting)")
            @RequestParam(name = "connectionStatus", required = false) DeviceConnectionStatus connectionStatus,
            @Parameter(description = "Search term for hardware device identifier or drone ID")
            @RequestParam(name = "search", required = false) String search,
            @Parameter(description = "Page size limit (default: 20, 0 or negative for unpaged)")
            @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Offset index (default: 0)")
            @RequestParam(defaultValue = "0") int offset
    ) {
        DeviceRegistrationListVm result = deviceRegistrationService.getDevices(connectionStatus, search, limit, offset);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/devices/online")
    @Operation(summary = "List currently online devices", description = "Returns list of active online devices, applying automatic deadman-switch timeout pruning (30s threshold).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Online devices retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, array = @ArraySchema(schema = @Schema(implementation = DeviceRegistrationVm.class)))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<List<DeviceRegistrationVm>> getOnlineDevices() {
        List<DeviceRegistrationVm> result = deviceRegistrationService.getOnlineDevices();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/devices/{id}")
    @Operation(summary = "Get device details by ID", description = "Returns detailed profile of a device registration. Supports lookup by registration UUID, deviceIdentifier, or droneId.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Device details retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = DeviceRegistrationVm.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Device registration not found", content = @Content)
    })
    public ResponseEntity<DeviceRegistrationVm> getDeviceById(
            @Parameter(description = "Unique registration UUID, device identifier, or drone UUID", example = "d1b2c3d4-e5f6-7890-abcd-ef1234567890")
            @PathVariable("id") String id
    ) {
        DeviceRegistrationVm result = deviceRegistrationService.getDeviceById(id);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/devices/{id}/heartbeat")
    @Operation(summary = "Send device heartbeat ping", description = "Heartbeat signal sent periodically by IoT hardware/gateway to maintain online presence. Supports lookup by id, deviceIdentifier, or droneId.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Heartbeat processed successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = HeartbeatResultVm.class))),
            @ApiResponse(responseCode = "400", description = "Invalid heartbeat payload", content = @Content),
            @ApiResponse(responseCode = "404", description = "Device registration not found", content = @Content)
    })
    public ResponseEntity<HeartbeatResultVm> processHeartbeat(
            @Parameter(description = "Unique registration UUID, device identifier, or drone UUID", example = "DRONE-MAC-9876543210AB")
            @PathVariable("id") String id,
            @Valid @RequestBody(required = false) DeviceHeartbeatPostVm heartbeatVm
    ) {
        HeartbeatResultVm result = deviceRegistrationService.processHeartbeat(id, heartbeatVm);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/devices/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Revoke device registration", description = "Removes hardware device registration. Rejected if the drone is actively in flight or in mission. Requires admin role.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Device registration revoked successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = RevokeResultVm.class))),
            @ApiResponse(responseCode = "400", description = "Bad Request - Drone is actively flying/in mission", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Admin role required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Admin role required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Device registration not found", content = @Content)
    })
    public ResponseEntity<RevokeResultVm> revokeDeviceRegistration(
            @Parameter(description = "Unique registration UUID, device identifier, or drone UUID", example = "d1b2c3d4-e5f6-7890-abcd-ef1234567890")
            @PathVariable("id") String id
    ) {
        RevokeResultVm result = deviceRegistrationService.revokeDeviceRegistration(id);
        return ResponseEntity.ok(result);
    }
}
