package com.utm.mission.controller;

import com.utm.mission.service.MissionExecutionService;
import com.utm.mission.viewmodel.execution.MissionExecutePostVm;
import com.utm.mission.viewmodel.execution.MissionExecutionAbortPostVm;
import com.utm.mission.viewmodel.execution.MissionExecutionPlanVm;
import com.utm.mission.viewmodel.execution.MissionExecutionReassignLegPostVm;
import com.utm.mission.viewmodel.execution.MissionExecutionResultVm;
import com.utm.mission.viewmodel.execution.MissionExecutionVm;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Mission Executions", description = "Endpoints for planning, initiating, controlling, and tracking multi-leg mission executions")
public class MissionExecutionController {

    private final MissionExecutionService missionExecutionService;

    @GetMapping("/api/v1/missions/{missionId}/execution-plan")
    @Operation(summary = "Preview multi-leg execution plan", description = "Dry-run decomposes mission into flight legs, evaluates airspace compliance, battery energy, candidate drones per leg, and charging stop recommendations")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Execution plan calculated successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = MissionExecutionPlanVm.class))),
            @ApiResponse(responseCode = "400", description = "Mission has fewer than 2 waypoints", content = @Content),
            @ApiResponse(responseCode = "404", description = "Mission not found", content = @Content)
    })
    public ResponseEntity<MissionExecutionPlanVm> getExecutionPlan(
            @Parameter(description = "Unique UUID identifier of the mission") @PathVariable String missionId,
            @Parameter(description = "Preview automatic charging hub insertion when route exceeds battery range") @RequestParam(defaultValue = "false") boolean autoSplitByRange) {
        return ResponseEntity.ok(missionExecutionService.getExecutionPlan(missionId, autoSplitByRange));
    }

    @PostMapping("/api/v1/missions/{missionId}/execute")
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'admin')")
    @Operation(summary = "Execute mission", description = "Converts draft/scheduled mission into a single-leg or multi-leg active flight execution with Saga rollback protection")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Mission execution started and flight leg(s) generated", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = MissionExecutionResultVm.class))),
            @ApiResponse(responseCode = "400", description = "Invalid mission state, fewer than 2 waypoints, or no eligible drone", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Mission or Drone not found", content = @Content)
    })
    public ResponseEntity<MissionExecutionResultVm> executeMission(
            @Parameter(description = "Unique UUID identifier of the mission", example = "550e8400-e29b-41d4-a716-446655440000") @PathVariable String missionId,
            @Valid @RequestBody MissionExecutePostVm postVm) {
        MissionExecutionResultVm result = missionExecutionService.executeMission(missionId, postVm);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/api/v1/missions/{missionId}/executions")
    @Operation(summary = "Get mission executions", description = "Get list of all execution runs for a given mission")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "List of executions retrieved successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = MissionExecutionVm.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<List<MissionExecutionVm>> getExecutionsByMissionId(
            @Parameter(description = "Unique UUID identifier of the mission", example = "550e8400-e29b-41d4-a716-446655440000") @PathVariable String missionId) {
        return ResponseEntity.ok(missionExecutionService.getExecutionsByMissionId(missionId));
    }

    @GetMapping("/api/v1/executions/{id}")
    @Operation(summary = "Get execution by ID", description = "Get progress profile and leg statuses of a specific mission execution")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Execution profile retrieved successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = MissionExecutionVm.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Execution not found", content = @Content)
    })
    public ResponseEntity<MissionExecutionVm> getExecutionById(
            @Parameter(description = "Unique UUID identifier of the execution", example = "550e8400-e29b-41d4-a716-446655440000") @PathVariable String id) {
        return ResponseEntity.ok(missionExecutionService.getExecutionById(id));
    }

    @PostMapping("/api/v1/executions/{id}/pause")
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'atc', 'admin')")
    @Operation(summary = "Pause mission execution", description = "Pauses an in-progress execution and sends HOVER to any active leg drone")
    public ResponseEntity<MissionExecutionVm> pauseExecution(@PathVariable String id) {
        return ResponseEntity.ok(missionExecutionService.pauseExecution(id));
    }

    @PostMapping("/api/v1/executions/{id}/resume")
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'atc', 'admin')")
    @Operation(summary = "Resume mission execution", description = "Resumes a paused execution and sends RESUME to any active leg drone")
    public ResponseEntity<MissionExecutionVm> resumeExecution(@PathVariable String id) {
        return ResponseEntity.ok(missionExecutionService.resumeExecution(id));
    }

    @PostMapping("/api/v1/executions/{id}/abort")
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'atc', 'admin')")
    @Operation(summary = "Abort mission execution", description = "Cancels all pending leg flights and aborts any active flight leg")
    public ResponseEntity<MissionExecutionVm> abortExecution(
            @PathVariable String id,
            @RequestBody(required = false) MissionExecutionAbortPostVm abortVm) {
        return ResponseEntity.ok(missionExecutionService.abortExecution(id, abortVm));
    }

    @PostMapping("/api/v1/executions/{id}/legs/{legIndex}/reassign-drone")
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'atc', 'admin')")
    @Operation(summary = "Reassign replacement drone to upcoming leg", description = "Assigns a replacement available drone at the leg departure hub and updates the generated flight plan")
    public ResponseEntity<MissionExecutionVm> reassignLegDrone(
            @PathVariable String id,
            @PathVariable int legIndex,
            @Valid @RequestBody MissionExecutionReassignLegPostVm reassignVm) {
        return ResponseEntity.ok(missionExecutionService.reassignLegDrone(id, legIndex, reassignVm));
    }
}
