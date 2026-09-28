package com.utm.drone.controller;

import com.utm.drone.service.DroneService;
import com.utm.drone.viewmodel.DronePostVm;
import com.utm.drone.viewmodel.DronePutVm;
import com.utm.drone.viewmodel.DroneVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/drones")
@RequiredArgsConstructor
@Tag(name = "Drones / UAS Management", description = "Management of Unmanned Aircraft Systems (Drones / UAS)")
public class DroneController {

    private final DroneService droneService;

    @GetMapping
    @Operation(summary = "List all Drones", description = "Retrieve a list of all registered drones in the DROPS-UTM system along with their statuses.")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Drones retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            array = @ArraySchema(schema = @Schema(implementation = DroneVm.class))
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<List<DroneVm>> getAllDrones() {
        return ResponseEntity.ok(droneService.getAllDrones());
    }

    @PostMapping
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
                                      "registrationNumber": "SX-UAS-001",
                                      "model": "DJI Matrice 350 RTK",
                                      "manufacturer": "DJI",
                                      "maxSpeedMps": 23.0,
                                      "maxFlightTimeMin": 55,
                                      "maxPayloadKg": 2.7,
                                      "currentHubId": "hub-hcm-01",
                                      "notes": "Equipped with Zenmuse H20T thermal sensor"
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
            @ApiResponse(responseCode = "409", description = "Registration number already exists", content = @Content)
    })
    public ResponseEntity<DroneVm> createDrone(@Valid @RequestBody DronePostVm dronePostVm) {
        DroneVm createdDrone = droneService.createDrone(dronePostVm);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdDrone);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get Drone by ID", description = "Retrieve complete technical profile, specifications, and current location of a drone.")
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
    @Operation(summary = "Update Drone information", description = "Update operational status, assigned hub station, or maintenance notes.")
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
                                      "status": "maintenance",
                                      "currentHubId": "hub-hcm-02",
                                      "notes": "Completed scheduled 100-hour flight maintenance",
                                      "maxSpeedMps": 23.0,
                                      "maxFlightTimeMin": 55,
                                      "maxPayloadKg": 2.7
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
            @ApiResponse(responseCode = "400", description = "Invalid request payload", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Drone not found by ID", content = @Content)
    })
    public ResponseEntity<DroneVm> updateDrone(
            @Parameter(description = "Unique UUID identifier of the drone", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            @PathVariable String id,
            @Valid @RequestBody DronePutVm dronePutVm
    ) {
        return ResponseEntity.ok(droneService.updateDrone(id, dronePutVm));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Retire Drone", description = "Permanently retire an unmanned aircraft from operational service.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Drone retired successfully", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Drone not found by ID", content = @Content)
    })
    public ResponseEntity<Void> retireDrone(
            @Parameter(description = "Unique UUID identifier of the drone", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            @PathVariable String id
    ) {
        droneService.retireDrone(id);
        return ResponseEntity.ok().build();
    }
}
