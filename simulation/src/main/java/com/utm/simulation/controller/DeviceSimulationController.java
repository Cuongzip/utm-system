package com.utm.simulation.controller;

import com.utm.simulation.service.DeviceKeepAliveService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/simulation/devices")
@RequiredArgsConstructor
@Tag(name = "Device Power Simulation", description = "Endpoints for simulating hardware power switch (ON/OFF) and automatic keepalive heartbeats")
public class DeviceSimulationController {

    private final DeviceKeepAliveService deviceKeepAliveService;

    @PostMapping("/{id}/power-on")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator', 'pilot')")
    @Operation(summary = "Power ON device in simulation", description = "Turns on virtual hardware power, immediately sends heartbeat to connectivity, and starts periodic 10s keepalive pulse.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Device powered ON successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid device ID supplied"),
            @ApiResponse(responseCode = "404", description = "Device registration not found in connectivity service")
    })
    public ResponseEntity<Void> powerOn(
            @Parameter(description = "Device registration ID, hardware identifier, or drone ID", required = true)
            @PathVariable("id") String id
    ) {
        deviceKeepAliveService.powerOn(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/power-off")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator', 'pilot')")
    @Operation(summary = "Power OFF device in simulation", description = "Turns off virtual hardware power and deactivates heartbeat pulses. Device will transition to OFFLINE in connectivity service after 30s timeout.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Device powered OFF successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid device ID supplied")
    })
    public ResponseEntity<Void> powerOff(
            @Parameter(description = "Device registration ID, hardware identifier, or drone ID", required = true)
            @PathVariable("id") String id
    ) {
        deviceKeepAliveService.powerOff(id);
        return ResponseEntity.noContent().build();
    }
}
