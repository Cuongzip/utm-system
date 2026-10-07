package com.utm.alert.controller;

import com.utm.alert.service.AlertService;
import com.utm.alert.viewmodel.AlertAcknowledgePostVm;
import com.utm.alert.viewmodel.AlertListVm;
import com.utm.alert.viewmodel.AlertPostVm;
import com.utm.alert.viewmodel.AlertResolvePostVm;
import com.utm.alert.viewmodel.AlertVm;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
@Tag(name = "Alerts & Monitoring", description = "DROPS-UTM Module 11: Real-time operational alerting, conformance breach notifications, system safety monitoring, and operator acknowledgment workflows")
public class AlertsController {

    private final AlertService alertService;

    @GetMapping
    @Operation(summary = "List system alerts", description = "Query historical and active operational alerts with multi-dimensional filtering by drone, flight, severity, and resolution state.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "List of alerts retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = AlertListVm.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT required", content = @Content)
    })
    public ResponseEntity<AlertListVm> getAlerts(
            @Parameter(description = "Filter by drone UUID") @RequestParam(required = false) String droneId,
            @Parameter(description = "Filter by flight UUID") @RequestParam(required = false) String flightId,
            @Parameter(description = "Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)") @RequestParam(required = false) String severity,
            @Parameter(description = "Filter by acknowledgment status") @RequestParam(required = false) Boolean acknowledged,
            @Parameter(description = "Filter by resolution status") @RequestParam(required = false) Boolean resolved,
            @Parameter(description = "Filter by alert type code") @RequestParam(required = false) String alertType,
            @Parameter(description = "Page index (0-based)") @RequestParam(defaultValue = "0") int pageNo,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int pageSize,
            @Parameter(description = "Limit count (overrides pageSize)") @RequestParam(required = false) Integer limit
    ) {
        int effectiveSize = (limit != null && limit > 0) ? limit : pageSize;
        return ResponseEntity.ok(alertService.getAlerts(droneId, flightId, severity, acknowledged, resolved, alertType, pageNo, effectiveSize));
    }

    @GetMapping("/active")
    @Operation(summary = "List active unresolved alerts", description = "Retrieve all unresolved operational alerts requiring active monitoring or immediate operator intervention.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Active alerts retrieved",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, array = @ArraySchema(schema = @Schema(implementation = AlertVm.class)))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT required", content = @Content)
    })
    public ResponseEntity<List<AlertVm>> getActiveAlerts() {
        return ResponseEntity.ok(alertService.getActiveAlerts());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get alert details", description = "Retrieve complete technical metadata, breach values, and audit timeline for an alert.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Alert details retrieved",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = AlertVm.class))),
            @ApiResponse(responseCode = "404", description = "Alert not found", content = @Content)
    })
    public ResponseEntity<AlertVm> getAlertById(
            @Parameter(description = "Alert UUID identifier", required = true) @PathVariable String id
    ) {
        return ResponseEntity.ok(alertService.getAlertById(id));
    }

    @PostMapping("/{id}/acknowledge")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator')")
    @Operation(summary = "Acknowledge alert", description = "Record operator acknowledgment indicating that the alert has been seen and is under supervision.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Alert acknowledged",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = AlertVm.class))),
            @ApiResponse(responseCode = "404", description = "Alert not found", content = @Content)
    })
    public ResponseEntity<AlertVm> acknowledgeAlert(
            @Parameter(description = "Alert UUID", required = true) @PathVariable String id,
            @RequestBody(required = false) AlertAcknowledgePostVm acknowledgeVm
    ) {
        return ResponseEntity.ok(alertService.acknowledgeAlert(id, acknowledgeVm));
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator')")
    @Operation(summary = "Resolve alert", description = "Mark safety issue as resolved and safe separation or nominal corridor state restored.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Alert resolved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = AlertVm.class))),
            @ApiResponse(responseCode = "404", description = "Alert not found", content = @Content)
    })
    public ResponseEntity<AlertVm> resolveAlert(
            @Parameter(description = "Alert UUID", required = true) @PathVariable String id,
            @RequestBody(required = false) AlertResolvePostVm resolveVm
    ) {
        return ResponseEntity.ok(alertService.resolveAlert(id, resolveVm));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('admin', 'hub_operator', 'pilot')")
    @Operation(summary = "Trigger / create operational alert", description = "Publish a new operational alert from automated subsystems (conformance watchdog, conflict detector, battery monitor) or manual operator input.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Alert created successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = AlertVm.class))),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content)
    })
    public ResponseEntity<AlertVm> createAlert(@Valid @RequestBody AlertPostVm postVm) {
        AlertVm created = alertService.createAlert(postVm);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}

