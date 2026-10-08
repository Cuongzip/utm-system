package com.utm.flight.controller;

import com.utm.flight.service.FlightService;
import com.utm.flight.viewmodel.FlightAbortVm;
import com.utm.flight.viewmodel.FlightPostVm;
import com.utm.flight.viewmodel.FlightPutVm;
import com.utm.flight.viewmodel.FlightVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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
@RequestMapping("/api/v1/flights")
@RequiredArgsConstructor
@Tag(name = "Flights & Flight Plans", description = "Endpoints for managing flights and flight plans")
public class FlightController {

    private final FlightService flightService;

    @GetMapping
    @Operation(summary = "Get all flight plans", description = "Get list of flights filtered by status, pilotId or droneId")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "List of flights retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = FlightVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<List<FlightVm>> getAllFlights(
            @Parameter(description = "Filter by flight status (e.g., planned, authorized, active, completed, aborted)")
            @RequestParam(required = false) String status,
            @Parameter(description = "Filter by pilot ID (Keycloak user ID)")
            @RequestParam(required = false) String pilotId,
            @Parameter(description = "Filter by assigned drone ID")
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
            @ApiResponse(responseCode = "400", description = "Invalid request payload or drone unavailable", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content)
    })
    public ResponseEntity<FlightVm> createFlight(@Valid @RequestBody FlightPostVm flightPostVm) {
        FlightVm created = flightService.createFlight(flightPostVm);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
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
}
