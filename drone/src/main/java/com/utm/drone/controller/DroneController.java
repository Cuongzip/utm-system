package com.utm.drone.controller;

import com.utm.drone.model.enumeration.DroneStatus;
import com.utm.drone.service.DroneService;
import com.utm.drone.viewmodel.DroneListVm;
import com.utm.drone.viewmodel.DronePostVm;
import com.utm.drone.viewmodel.DronePutVm;
import com.utm.drone.viewmodel.DroneVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
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

import java.util.Map;

@RestController
@RequestMapping("/api/v1/drones")
@RequiredArgsConstructor
@Tag(name = "Drones / UAS Management", description = "Management of Unmanned Aircraft Systems (Drones / UAS), payloads, battery, and readiness status")
public class DroneController {

    private final DroneService droneService;

    @GetMapping
    @Operation(
            summary = "List all Drones",
            description = "Retrieve a paginated and filtered list of registered drones in the DROPS-UTM system, including operational status and hardware connectivity."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Drones retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = DroneListVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<DroneListVm> getDrones(
            @Parameter(description = "Filter by drone operational status (available, in_flight, maintenance, charging, offline)")
            @RequestParam(required = false) DroneStatus status,
            @Parameter(description = "Filter by base / home hub station ID")
            @RequestParam(required = false) String homeHubId,
            @Parameter(description = "Filter by owner organization ID")
            @RequestParam(required = false) String ownerId,
            @Parameter(description = "Search term for registration number, model, or manufacturer")
            @RequestParam(required = false) String search,
            @Parameter(description = "Page size limit (default: 20, 0 or negative for unpaged)")
            @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Offset index (default: 0)")
            @RequestParam(defaultValue = "0") int offset
    ) {
        return ResponseEntity.ok(droneService.getDrones(status, homeHubId, ownerId, search, limit, offset));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('admin', 'hub_operator', 'pilot')")
    @Operation(summary = "Register new Drone", description = "Register a new Unmanned Aircraft System into the DROPS-UTM platform.")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Drone registration details",
            required = true,
            content = @Content(
                    mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = DronePostVm.class),
                    examples = @ExampleObject(
                            name = "DronePostSample",
                            value = """
                                    {
                                      "registrationNumber": "VN-UAV-001",
                                      "manufacturer": "DJI",
                                      "model": "Matrice 350 RTK",
                                      "ownerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                                      "homeHubId": "96683f5a-769f-44aa-b4d3-16c72f2fe0a4",
                                      "batteryCapacityWh": 588.0,
                                      "maxPayload": 2.7
                                    }
                                    """
                    )
            )
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Drone registered successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = DroneVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or validation error", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Owner organization or Hub station not found", content = @Content),
            @ApiResponse(responseCode = "409", description = "Registration number already exists", content = @Content)
    })
    public ResponseEntity<DroneVm> createDrone(@Valid @RequestBody DronePostVm dronePostVm) {
        DroneVm createdDrone = droneService.createDrone(dronePostVm);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdDrone);
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Get Drone by ID",
            description = "Retrieve complete technical profile, specifications, owner organization, base hub, and device connectivity of a drone."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Drone details retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = DroneVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Drone not found by ID", content = @Content)
    })
    public ResponseEntity<DroneVm> getDroneById(
            @Parameter(description = "Unique UUID identifier of the drone", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            @PathVariable String id
    ) {
        return ResponseEntity.ok(droneService.getDroneById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator', 'pilot')")
    @Operation(
            summary = "Update Drone information",
            description = "Update operational status, assigned hub station, battery capacity, or max payload. In-flight drones cannot change hub or switch to maintenance."
    )
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Drone update payload",
            required = true,
            content = @Content(
                    mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = DronePutVm.class),
                    examples = @ExampleObject(
                            name = "DronePutSample",
                            value = """
                                    {
                                      "homeHubId": "96683f5a-769f-44aa-b4d3-16c72f2fe0a4",
                                      "batteryCapacityWh": 588.0,
                                      "maxPayload": 2.7,
                                      "status": "maintenance"
                                    }
                                    """
                    )
            )
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Drone updated successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = DroneVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or drone currently in flight", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Drone or Hub not found", content = @Content)
    })
    public ResponseEntity<DroneVm> updateDrone(
            @Parameter(description = "Unique UUID identifier of the drone", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            @PathVariable String id,
            @Valid @RequestBody DronePutVm dronePutVm
    ) {
        return ResponseEntity.ok(droneService.updateDrone(id, dronePutVm));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(
            summary = "Deactivate / Remove Drone",
            description = "Safely deactivate an unmanned aircraft from operational service. In-flight drones cannot be removed."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Drone removed / deactivated successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(value = "{\"message\": \"Drone removed successfully\"}")
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Drone currently in flight cannot be deleted", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Drone not found by ID", content = @Content)
    })
    public ResponseEntity<Map<String, String>> deleteDrone(
            @Parameter(description = "Unique UUID identifier of the drone", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            @PathVariable String id
    ) {
        droneService.deleteDrone(id);
        return ResponseEntity.ok(Map.of("message", "Drone removed successfully"));
    }
}
