package com.utm.flight.controller;

import com.utm.flight.service.FlightConformanceService;
import com.utm.flight.viewmodel.FlightConformanceVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/flights/{flightId}/conformance")
@RequiredArgsConstructor
@Tag(name = "Flight Conformance Monitoring", description = "Endpoints for 4D flight path conformance monitoring and corridor breach evaluation")
public class FlightConformanceController {

    private final FlightConformanceService conformanceService;

    @GetMapping
    @Operation(summary = "Get flight conformance status", description = "Retrieve current 4D flight conformance evaluation, lateral/vertical errors, and breach violations.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Flight conformance status retrieved",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = FlightConformanceVm.class))),
            @ApiResponse(responseCode = "404", description = "Flight not found", content = @Content)
    })
    public ResponseEntity<FlightConformanceVm> getConformance(
            @Parameter(description = "Flight UUID", required = true) @PathVariable String flightId) {
        return ResponseEntity.ok(conformanceService.getConformance(flightId));
    }

    @PostMapping("/evaluate")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator', 'pilot')")
    @Operation(summary = "Trigger immediate conformance evaluation", description = "Query latest drone telemetry and perform an immediate 4D volume cross-track & vertical breach assessment.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Conformance evaluated successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = FlightConformanceVm.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Flight not found", content = @Content)
    })
    public ResponseEntity<FlightConformanceVm> evaluateConformance(
            @Parameter(description = "Flight UUID", required = true) @PathVariable String flightId) {
        return ResponseEntity.ok(conformanceService.evaluateFlightConformance(flightId));
    }
}

