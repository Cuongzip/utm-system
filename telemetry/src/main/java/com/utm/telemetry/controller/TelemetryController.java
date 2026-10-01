package com.utm.telemetry.controller;

import com.utm.telemetry.service.TelemetryService;
import com.utm.telemetry.viewmodel.TelemetryIngestVm;
import com.utm.telemetry.viewmodel.TelemetryRecordVm;
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
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZonedDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/telemetry")
@RequiredArgsConstructor
@Tag(name = "Telemetry", description = "Endpoints for ingesting and querying real-time drone telemetry data")
public class TelemetryController {

    private final TelemetryService telemetryService;

    @PostMapping
    @Operation(summary = "Ingest drone telemetry data", description = "Push instantaneous telemetry packet (lat, lon, alt, speed, heading, battery) into system.")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Telemetry ingested successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = TelemetryRecordVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid request payload", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<TelemetryRecordVm> ingestTelemetry(@Valid @RequestBody TelemetryIngestVm ingestVm) {
        TelemetryRecordVm record = telemetryService.ingestTelemetry(ingestVm);
        return ResponseEntity.status(HttpStatus.CREATED).body(record);
    }

    @GetMapping("/flight/{flightId}")
    @Operation(summary = "Get telemetry history for a flight", description = "Retrieve historical trajectory breadcrumbs for a specific flight with optional time range.")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Telemetry history retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            array = @ArraySchema(schema = @Schema(implementation = TelemetryRecordVm.class))
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<List<TelemetryRecordVm>> getFlightTelemetryHistory(
            @PathVariable String flightId,
            @Parameter(description = "Start timestamp (ISO-8601 UTC)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) ZonedDateTime from,
            @Parameter(description = "End timestamp (ISO-8601 UTC)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) ZonedDateTime to
    ) {
        return ResponseEntity.ok(telemetryService.getFlightTrackHistory(flightId, from, to));
    }

    @GetMapping("/flight/{flightId}/latest")
    @Operation(summary = "Get latest telemetry for a flight", description = "Retrieve the most recent instantaneous telemetry position and health metrics for a flight.")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Latest telemetry retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = TelemetryRecordVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Telemetry record not found", content = @Content)
    })
    public ResponseEntity<TelemetryRecordVm> getLatestFlightTelemetry(@PathVariable String flightId) {
        return ResponseEntity.ok(telemetryService.getLatestByFlightId(flightId));
    }

    @GetMapping("/drone/{droneId}/latest")
    @Operation(summary = "Get latest telemetry for a drone", description = "Retrieve the most recent instantaneous telemetry position and health metrics for a drone hardware unit.")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Latest drone telemetry retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = TelemetryRecordVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Telemetry record not found", content = @Content)
    })
    public ResponseEntity<TelemetryRecordVm> getLatestDroneTelemetry(@PathVariable String droneId) {
        return ResponseEntity.ok(telemetryService.getLatestByDroneId(droneId));
    }
}
