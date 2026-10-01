package com.utm.airspace.controller;

import com.utm.airspace.service.AirspaceService;
import com.utm.airspace.viewmodel.AirspaceCheckPathResultVm;
import com.utm.airspace.viewmodel.AirspaceCheckPathVm;
import com.utm.airspace.viewmodel.AirspaceCheckResultVm;
import com.utm.airspace.viewmodel.AirspaceCheckVm;
import com.utm.airspace.viewmodel.AirspaceZonePostVm;
import com.utm.airspace.viewmodel.AirspaceZonePutVm;
import com.utm.airspace.viewmodel.AirspaceZoneVm;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/airspace")
@RequiredArgsConstructor
@Tag(name = "Airspace & Geofencing Management", description = "Endpoints for managing airspace zones, geofences, no-fly zones, and spatial path validation")
public class AirspaceController {

    private final AirspaceService airspaceService;

    @PostMapping("/check")
    @Operation(summary = "Check 3D point airspace compliance", description = "Verify if a 3D coordinate point (lat, lon, alt) violates any active restricted or prohibited airspace zones.")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Airspace compliance checked successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = AirspaceCheckResultVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid request payload", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<AirspaceCheckResultVm> checkPoint(@Valid @RequestBody AirspaceCheckVm checkVm) {
        return ResponseEntity.ok(airspaceService.checkPoint(checkVm));
    }

    @PostMapping("/check-path")
    @Operation(summary = "Check flight route polyline for airspace conflicts", description = "Validate a multi-waypoint flight path by sampling points along the trajectory at specified intervals to detect intersecting no-fly zones.")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Path verified successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = AirspaceCheckPathResultVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid request payload", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<AirspaceCheckPathResultVm> checkPath(@Valid @RequestBody AirspaceCheckPathVm checkPathVm) {
        return ResponseEntity.ok(airspaceService.checkPath(checkPathVm));
    }

    @GetMapping("/zones")
    @Operation(summary = "List all Airspace Zones", description = "Retrieve a list of all active or configured airspace zones and geofences with optional filtering.")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Airspace zones retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            array = @ArraySchema(schema = @Schema(implementation = AirspaceZoneVm.class))
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<List<AirspaceZoneVm>> getAllZones(
            @Parameter(description = "Filter by associated Vertiport Hub ID")
            @RequestParam(required = false) String hubId,
            @Parameter(description = "Filter by zone classification (restricted, prohibited, warning, corridor)")
            @RequestParam(required = false) String type,
            @Parameter(description = "Filter by operational status (active, inactive)")
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(airspaceService.getAllZones(hubId, type, status));
    }

    @PostMapping("/zones")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator')")
    @Operation(summary = "Create a new Airspace Zone / Geofence", description = "Establish a new 3D airspace restriction zone, buffer corridor, or temporary flight restriction (TFR). Requires admin or hub_operator role.")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Airspace zone created successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = AirspaceZoneVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or geometry error", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "409", description = "Airspace zone name already exists", content = @Content)
    })
    public ResponseEntity<AirspaceZoneVm> createZone(@Valid @RequestBody AirspaceZonePostVm postVm) {
        AirspaceZoneVm createdZone = airspaceService.createZone(postVm);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdZone);
    }

    @GetMapping("/zones/{id}")
    @Operation(summary = "Get Airspace Zone by ID", description = "Retrieve full spatial geometry, vertical limits, and configuration of an airspace zone.")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Airspace zone retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = AirspaceZoneVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Airspace zone not found", content = @Content)
    })
    public ResponseEntity<AirspaceZoneVm> getZoneById(
            @Parameter(description = "Unique UUID identifier of the airspace zone", example = "zone-ath-lgav-01")
            @PathVariable String id
    ) {
        return ResponseEntity.ok(airspaceService.getZoneById(id));
    }

    @PutMapping("/zones/{id}")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator')")
    @Operation(summary = "Update Airspace Zone", description = "Update spatial boundary coordinates, altitude envelope, or status of an existing airspace zone. Requires admin or hub_operator role.")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Airspace zone updated successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = AirspaceZoneVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or geometry error", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Airspace zone not found", content = @Content),
            @ApiResponse(responseCode = "409", description = "Airspace zone name already exists", content = @Content)
    })
    public ResponseEntity<AirspaceZoneVm> updateZone(
            @Parameter(description = "Unique UUID identifier of the airspace zone", example = "zone-ath-lgav-01")
            @PathVariable String id,
            @Valid @RequestBody AirspaceZonePutVm putVm
    ) {
        return ResponseEntity.ok(airspaceService.updateZone(id, putVm));
    }

    @DeleteMapping("/zones/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Delete Airspace Zone", description = "Decommission and permanently remove an airspace zone or geofence restriction. Requires admin role.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Airspace zone deleted successfully", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Admin role required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Airspace zone not found", content = @Content)
    })
    public ResponseEntity<Void> deleteZone(
            @Parameter(description = "Unique UUID identifier of the airspace zone", example = "zone-ath-lgav-01")
            @PathVariable String id
    ) {
        airspaceService.deleteZone(id);
        return ResponseEntity.ok().build();
    }
}
