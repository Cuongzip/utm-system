package com.utm.emergency.controller;

import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.service.DecisionEngineService;
import com.utm.emergency.service.EmergencyIncidentService;
import com.utm.emergency.viewmodel.incident.ConfirmIncidentVm;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentPostVm;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentVm;
import com.utm.emergency.viewmodel.incident.IncidentPageVm;
import com.utm.emergency.viewmodel.incident.PendingConfirmationVm;
import com.utm.emergency.viewmodel.incident.RootCauseVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZonedDateTime;
import java.util.List;

@RestController
@RequestMapping({ "/api/v1/emergency/incidents", "/emergency/incidents" })
@Tag(name = "Emergency Incidents", description = "Endpoints for managing emergency incidents and failsafe decision confirmations")
@RequiredArgsConstructor
public class EmergencyIncidentController {

    private final EmergencyIncidentService incidentService;
    private final DecisionEngineService decisionEngine;

    @GetMapping
    @Operation(summary = "Search and filter emergency incidents with pagination")
    public ResponseEntity<IncidentPageVm> getIncidents(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) EmergencySeverity severity,
            @RequestParam(required = false) EmergencyType type,
            @RequestParam(required = false) String droneId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) ZonedDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) ZonedDateTime to,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return ResponseEntity
                .ok(incidentService.searchIncidents(status, severity, type, droneId, from, to, limit, offset));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('admin', 'atc', 'pilot', 'operator')")
    @Operation(summary = "Report and ingest a new emergency incident from flight watchdog or telemetry")
    public ResponseEntity<EmergencyIncidentVm> createIncident(
            @Valid @RequestBody EmergencyIncidentPostVm postVm,
            @AuthenticationPrincipal Jwt jwt) {
        String reportedBy = jwt != null ? jwt.getSubject() : "system";
        EmergencyIncidentVm created = incidentService.createIncident(postVm, reportedBy);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/active")
    @Operation(summary = "Get all active, pending, and executing incidents for map radar")
    public ResponseEntity<List<EmergencyIncidentVm>> getActiveIncidents() {
        return ResponseEntity.ok(incidentService.getActiveIncidents());
    }

    @GetMapping("/pending")
    @Operation(summary = "Get incidents currently in countdown queue waiting for operator confirmation")
    public ResponseEntity<List<PendingConfirmationVm>> getPendingConfirmations() {
        return ResponseEntity.ok(decisionEngine.getPendingConfirmations());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get incident details and event timeline by ID")
    public ResponseEntity<EmergencyIncidentVm> getIncident(@PathVariable String id) {
        return ResponseEntity.ok(incidentService.getIncidentById(id));
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('pilot', 'atc', 'admin')")
    @Operation(summary = "Operator confirm or reject emergency failsafe action")
    public ResponseEntity<EmergencyIncidentVm> confirmIncident(
            @PathVariable String id,
            @Valid @RequestBody ConfirmIncidentVm body,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt != null ? jwt.getSubject() : "operator";
        return ResponseEntity.ok(decisionEngine.confirmAction(id, body.approved(), userId));
    }

    @PutMapping("/{id}/root-cause")
    @PreAuthorize("hasAnyRole('atc', 'admin')")
    @Operation(summary = "Update post-incident investigation root cause analysis")
    public ResponseEntity<EmergencyIncidentVm> updateRootCause(
            @PathVariable String id,
            @Valid @RequestBody RootCauseVm body) {
        return ResponseEntity.ok(incidentService.updateRootCause(id, body));
    }
}
