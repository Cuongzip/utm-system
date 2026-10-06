package com.utm.flight.controller;

import com.utm.flight.service.FlightService;
import com.utm.flight.service.FlightWaypointService;
import com.utm.flight.viewmodel.FlightAbortVm;
import com.utm.flight.viewmodel.FlightPostVm;
import com.utm.flight.viewmodel.FlightPutVm;
import com.utm.flight.viewmodel.FlightVm;
import com.utm.flight.viewmodel.WaypointPostVm;
import com.utm.flight.viewmodel.WaypointPutVm;
import com.utm.flight.viewmodel.WaypointReorderVm;
import com.utm.flight.viewmodel.WaypointVm;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/flights")
@RequiredArgsConstructor
@Tag(name = "Flights & Flight Plans", description = "Endpoints for managing flights and flight plans")
public class FlightController {

    private final FlightService flightService;
    private final FlightWaypointService flightWaypointService;

    @GetMapping
    @Operation(summary = "Get all flight plans", description = "Get list of flights filtered by status, pilotId or droneId")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Flights retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            array = @ArraySchema(schema = @Schema(implementation = FlightVm.class))
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<List<FlightVm>> getAllFlights(
            @Parameter(description = "Filter by flight status (e.g. planned, authorized, active, completed, aborted)")
            @RequestParam(required = false) String status,
            @Parameter(description = "Filter by pilot ID")
            @RequestParam(required = false) String pilotId,
            @Parameter(description = "Filter by drone UUID identifier")
            @RequestParam(required = false) String droneId
    ) {
        return ResponseEntity.ok(flightService.getAllFlights(status, pilotId, droneId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('pilot', 'admin')")
    @Operation(summary = "Create a new flight plan", description = "Register a new flight plan with planned status")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Flight plan created successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = FlightVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid request payload", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Drone or Hub not found", content = @Content),
            @ApiResponse(responseCode = "409", description = "Flight number already exists", content = @Content)
    })
    public ResponseEntity<FlightVm> createFlight(@Valid @RequestBody FlightPostVm flightPostVm) {
        FlightVm createdFlight = flightService.createFlight(flightPostVm);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdFlight);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get flight by ID", description = "Get detailed information of a specific flight")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Flight retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = FlightVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Flight not found", content = @Content)
    })
    public ResponseEntity<FlightVm> getFlightById(
            @Parameter(description = "Unique UUID identifier of the flight", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String id
    ) {
        return ResponseEntity.ok(flightService.getFlightById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('pilot', 'admin')")
    @Operation(summary = "Update flight plan", description = "Update flight plan before takeoff")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Flight plan updated successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = FlightVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid flight state or request payload", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Flight not found", content = @Content)
    })
    public ResponseEntity<FlightVm> updateFlight(
            @Parameter(description = "Unique UUID identifier of the flight", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String id,
            @Valid @RequestBody FlightPutVm flightPutVm
    ) {
        return ResponseEntity.ok(flightService.updateFlight(id, flightPutVm));
    }

    @PostMapping("/{id}/authorize")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator')")
    @Operation(summary = "Request UTM authorization", description = "Authorize flight plan to move from planned to authorized")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Flight authorized successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = FlightVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Flight is not in planned state", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Flight not found", content = @Content)
    })
    public ResponseEntity<FlightVm> authorizeFlight(
            @Parameter(description = "Unique UUID identifier of the flight", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String id
    ) {
        return ResponseEntity.ok(flightService.authorizeFlight(id));
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('pilot', 'admin')")
    @Operation(summary = "Start flight", description = "Takeoff drone and mark flight as active")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Flight started successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = FlightVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Flight is not in authorized state", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Flight not found", content = @Content)
    })
    public ResponseEntity<FlightVm> startFlight(
            @Parameter(description = "Unique UUID identifier of the flight", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String id
    ) {
        return ResponseEntity.ok(flightService.startFlight(id));
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('pilot', 'admin', 'hub_operator')")
    @Operation(summary = "Complete flight", description = "Land drone safely and mark flight as completed")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Flight completed successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = FlightVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Flight is not in active state", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Flight not found", content = @Content)
    })
    public ResponseEntity<FlightVm> completeFlight(
            @Parameter(description = "Unique UUID identifier of the flight", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String id
    ) {
        return ResponseEntity.ok(flightService.completeFlight(id));
    }

    @PostMapping("/{id}/abort")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator', 'pilot')")
    @Operation(summary = "Abort flight", description = "Emergency abort or cancel flight")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Flight aborted successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = FlightVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Flight cannot be aborted", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Flight not found", content = @Content)
    })
    public ResponseEntity<FlightVm> abortFlight(
            @Parameter(description = "Unique UUID identifier of the flight", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String id,
            @RequestBody(required = false) FlightAbortVm abortVm
    ) {
        return ResponseEntity.ok(flightService.abortFlight(id, abortVm));
    }

    @GetMapping("/{id}/waypoints")
    @Operation(summary = "Get flight waypoints", description = "Get list of all 3D trajectory waypoints along the planned flight route")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Waypoints retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            array = @ArraySchema(schema = @Schema(implementation = WaypointVm.class))
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Flight not found", content = @Content)
    })
    public ResponseEntity<List<WaypointVm>> getFlightWaypoints(
            @Parameter(description = "Unique UUID identifier of the flight", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String id
    ) {
        return ResponseEntity.ok(flightWaypointService.getFlightWaypoints(id));
    }

    @GetMapping("/{id}/waypoints/{waypointId}")
    @Operation(summary = "Get waypoint by ID", description = "Get details of a specific waypoint on a flight")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Waypoint retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = WaypointVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Flight or Waypoint not found", content = @Content)
    })
    public ResponseEntity<WaypointVm> getWaypointById(
            @Parameter(description = "Unique UUID identifier of the flight", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String id,
            @Parameter(description = "Unique UUID identifier of the waypoint", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
            @PathVariable String waypointId
    ) {
        return ResponseEntity.ok(flightWaypointService.getWaypointById(id, waypointId));
    }

    @PostMapping("/{id}/waypoints")
    @PreAuthorize("hasAnyRole('pilot', 'admin')")
    @Operation(summary = "Add waypoint to flight", description = "Add a new 3D coordinate waypoint into the flight trajectory")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Waypoint added successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = WaypointVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or flight status", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Flight not found", content = @Content)
    })
    public ResponseEntity<WaypointVm> addWaypoint(
            @Parameter(description = "Unique UUID identifier of the flight", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String id,
            @Valid @RequestBody WaypointPostVm postVm
    ) {
        WaypointVm created = flightWaypointService.addWaypoint(id, postVm);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}/waypoints/{waypointId}")
    @PreAuthorize("hasAnyRole('pilot', 'admin')")
    @Operation(summary = "Update waypoint", description = "Modify coordinates, altitude, speed or hover time of a specific waypoint")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Waypoint updated successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = WaypointVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or flight status", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Flight or Waypoint not found", content = @Content)
    })
    public ResponseEntity<WaypointVm> updateWaypoint(
            @Parameter(description = "Unique UUID identifier of the flight", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String id,
            @Parameter(description = "Unique UUID identifier of the waypoint", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
            @PathVariable String waypointId,
            @Valid @RequestBody WaypointPutVm putVm
    ) {
        return ResponseEntity.ok(flightWaypointService.updateWaypoint(id, waypointId, putVm));
    }

    @DeleteMapping("/{id}/waypoints/{waypointId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('pilot', 'admin')")
    @Operation(summary = "Delete waypoint", description = "Remove a waypoint from the flight trajectory")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Waypoint deleted successfully"),
            @ApiResponse(responseCode = "400", description = "Cannot modify active or completed flight", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Flight or Waypoint not found", content = @Content)
    })
    public ResponseEntity<Void> deleteWaypoint(
            @Parameter(description = "Unique UUID identifier of the flight", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String id,
            @Parameter(description = "Unique UUID identifier of the waypoint", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
            @PathVariable String waypointId
    ) {
        flightWaypointService.deleteWaypoint(id, waypointId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/waypoints/reorder")
    @PreAuthorize("hasAnyRole('pilot', 'admin')")
    @Operation(summary = "Reorder waypoints", description = "Reorder all waypoints along the flight path using new sequence numbers")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Waypoints reordered successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            array = @ArraySchema(schema = @Schema(implementation = WaypointVm.class))
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid sequence list or flight status", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Flight or Waypoint not found", content = @Content)
    })
    public ResponseEntity<List<WaypointVm>> reorderWaypoints(
            @Parameter(description = "Unique UUID identifier of the flight", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String id,
            @Valid @RequestBody WaypointReorderVm reorderVm
    ) {
        return ResponseEntity.ok(flightWaypointService.reorderWaypoints(id, reorderVm));
    }
}

