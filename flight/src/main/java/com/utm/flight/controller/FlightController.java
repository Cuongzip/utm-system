package com.utm.flight.controller;

import com.utm.flight.service.FlightService;
import com.utm.flight.viewmodel.FlightAbortVm;
import com.utm.flight.viewmodel.FlightPostVm;
import com.utm.flight.viewmodel.FlightPutVm;
import com.utm.flight.viewmodel.FlightVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
            @ApiResponse(responseCode = "200", description = "Flights retrieved successfully")
    })
    public ResponseEntity<List<FlightVm>> getAllFlights(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String pilotId,
            @RequestParam(required = false) String droneId
    ) {
        return ResponseEntity.ok(flightService.getAllFlights(status, pilotId, droneId));
    }

    @PostMapping
    @Operation(summary = "Create a new flight plan", description = "Register a new flight plan with planned status")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Flight plan created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload"),
            @ApiResponse(responseCode = "404", description = "Drone or Hub not found"),
            @ApiResponse(responseCode = "409", description = "Flight number already exists")
    })
    public ResponseEntity<FlightVm> createFlight(@Valid @RequestBody FlightPostVm flightPostVm) {
        FlightVm createdFlight = flightService.createFlight(flightPostVm);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdFlight);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get flight by ID", description = "Get detailed information of a specific flight")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Flight retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Flight not found")
    })
    public ResponseEntity<FlightVm> getFlightById(@PathVariable String id) {
        return ResponseEntity.ok(flightService.getFlightById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update flight plan", description = "Update flight plan before takeoff")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Flight plan updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid flight state or request payload"),
            @ApiResponse(responseCode = "404", description = "Flight not found")
    })
    public ResponseEntity<FlightVm> updateFlight(
            @PathVariable String id,
            @Valid @RequestBody FlightPutVm flightPutVm
    ) {
        return ResponseEntity.ok(flightService.updateFlight(id, flightPutVm));
    }

    @PostMapping("/{id}/authorize")
    @Operation(summary = "Request UTM authorization", description = "Authorize flight plan to move from planned to authorized")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Flight authorized successfully"),
            @ApiResponse(responseCode = "400", description = "Flight is not in planned state"),
            @ApiResponse(responseCode = "404", description = "Flight not found")
    })
    public ResponseEntity<FlightVm> authorizeFlight(@PathVariable String id) {
        return ResponseEntity.ok(flightService.authorizeFlight(id));
    }

    @PostMapping("/{id}/start")
    @Operation(summary = "Start flight", description = "Takeoff drone and mark flight as active")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Flight started successfully"),
            @ApiResponse(responseCode = "400", description = "Flight is not in authorized state"),
            @ApiResponse(responseCode = "404", description = "Flight not found")
    })
    public ResponseEntity<FlightVm> startFlight(@PathVariable String id) {
        return ResponseEntity.ok(flightService.startFlight(id));
    }

    @PostMapping("/{id}/complete")
    @Operation(summary = "Complete flight", description = "Land drone safely and mark flight as completed")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Flight completed successfully"),
            @ApiResponse(responseCode = "400", description = "Flight is not in active state"),
            @ApiResponse(responseCode = "404", description = "Flight not found")
    })
    public ResponseEntity<FlightVm> completeFlight(@PathVariable String id) {
        return ResponseEntity.ok(flightService.completeFlight(id));
    }

    @PostMapping("/{id}/abort")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator', 'pilot')")
    @Operation(summary = "Abort flight", description = "Emergency abort or cancel flight")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Flight aborted successfully"),
            @ApiResponse(responseCode = "400", description = "Flight cannot be aborted"),
            @ApiResponse(responseCode = "403", description = "Forbidden"),
            @ApiResponse(responseCode = "404", description = "Flight not found")
    })
    public ResponseEntity<FlightVm> abortFlight(
            @PathVariable String id,
            @RequestBody(required = false) FlightAbortVm abortVm
    ) {
        return ResponseEntity.ok(flightService.abortFlight(id, abortVm));
    }
}
