package com.utm.conflict.controller;

import com.utm.commonlibrary.utils.AuthenticationUtils;
import com.utm.conflict.service.ConflictDetectionService;
import com.utm.conflict.service.ConflictService;
import com.utm.conflict.viewmodel.ConflictResolvePostVm;
import com.utm.conflict.viewmodel.ConflictScanResultVm;
import com.utm.conflict.viewmodel.ConflictVm;
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
@RequestMapping("/api/v1/conflicts")
@RequiredArgsConstructor
@Tag(name = "Conflicts", description = "Airspace Conflict Detection and Resolution Endpoints (Module 13)")
public class ConflictController {

    private final ConflictService conflictService;
    private final ConflictDetectionService conflictDetectionService;

    @GetMapping
    @Operation(summary = "List all conflicts", description = "Get list of all detected airspace conflicts with optional filters")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Conflicts retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            array = @ArraySchema(schema = @Schema(implementation = ConflictVm.class))
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<List<ConflictVm>> getAllConflicts(
            @Parameter(description = "Filter by conflict status (detected, notified, resolving, resolved)")
            @RequestParam(required = false) String status,
            @Parameter(description = "Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)")
            @RequestParam(required = false) String severity,
            @Parameter(description = "Filter by flight ID (primary or secondary)")
            @RequestParam(required = false) String flightId
    ) {
        return ResponseEntity.ok(conflictService.getAllConflicts(status, severity, flightId));
    }

    @GetMapping("/active")
    @Operation(summary = "Get active conflicts", description = "List currently active and unresolved conflicts requiring avoidance actions")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Active conflicts retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            array = @ArraySchema(schema = @Schema(implementation = ConflictVm.class))
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<List<ConflictVm>> getActiveConflicts() {
        return ResponseEntity.ok(conflictService.getActiveConflicts());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get conflict details", description = "Retrieve detailed information of a specific airspace conflict including separation and CPA")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Conflict details retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ConflictVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Conflict not found", content = @Content)
    })
    public ResponseEntity<ConflictVm> getConflictById(
            @Parameter(description = "Unique UUID identifier of the conflict", required = true)
            @PathVariable String id
    ) {
        return ResponseEntity.ok(conflictService.getConflictById(id));
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator')")
    @Operation(summary = "Resolve conflict", description = "Apply resolution strategy (altitude_change, speed_adjustment, reroute, hold) and mark conflict as resolved")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Conflict resolved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ConflictVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid resolution payload", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Conflict not found", content = @Content)
    })
    public ResponseEntity<ConflictVm> resolveConflict(
            @Parameter(description = "Unique UUID identifier of the conflict", required = true)
            @PathVariable String id,
            @Valid @RequestBody ConflictResolvePostVm resolveVm
    ) {
        String resolvedBy = null;
        try {
            resolvedBy = AuthenticationUtils.extractUserId();
        } catch (Exception ex) {
            var auth = AuthenticationUtils.getAuthentication();
            if (auth != null) {
                resolvedBy = auth.getName();
            }
        }
        return ResponseEntity.ok(conflictService.resolveConflict(id, resolveVm, resolvedBy));
    }

    @PostMapping("/evaluate")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator')")
    @Operation(summary = "Trigger conflict detection evaluation", description = "Manually trigger an immediate conflict evaluation scan across all airborne flights")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Conflict detection scan completed successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ConflictScanResultVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content)
    })
    public ResponseEntity<ConflictScanResultVm> evaluateConflicts() {
        return ResponseEntity.ok(conflictDetectionService.runConflictScan());
    }
}
