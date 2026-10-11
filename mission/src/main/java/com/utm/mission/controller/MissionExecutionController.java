package com.utm.mission.controller;

import com.utm.mission.service.MissionExecutionService;
import com.utm.mission.viewmodel.MissionExecutePostVm;
import com.utm.mission.viewmodel.MissionExecutionResultVm;
import com.utm.mission.viewmodel.MissionExecutionVm;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Mission Executions", description = "Endpoints for initiating and tracking mission flight executions")
public class MissionExecutionController {

    private final MissionExecutionService missionExecutionService;

    @PostMapping("/api/v1/missions/{missionId}/execute")
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'admin')")
    @Operation(summary = "Execute mission", description = "Converts draft/scheduled mission into an active flight execution")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Mission execution started and flight plan generated",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = MissionExecutionResultVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid mission state or fewer than 2 waypoints", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Mission or Drone not found", content = @Content)
    })
    public ResponseEntity<MissionExecutionResultVm> executeMission(
            @Parameter(description = "Unique UUID identifier of the mission", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String missionId,
            @Valid @RequestBody MissionExecutePostVm postVm
    ) {
        MissionExecutionResultVm result = missionExecutionService.executeMission(missionId, postVm);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/api/v1/missions/{missionId}/executions")
    @Operation(summary = "Get mission executions", description = "Get list of all execution runs for a given mission")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "List of executions retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = MissionExecutionVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<List<MissionExecutionVm>> getExecutionsByMissionId(
            @Parameter(description = "Unique UUID identifier of the mission", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String missionId
    ) {
        return ResponseEntity.ok(missionExecutionService.getExecutionsByMissionId(missionId));
    }

    @GetMapping("/api/v1/executions/{id}")
    @Operation(summary = "Get execution by ID", description = "Get progress profile of a specific mission execution")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Execution profile retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = MissionExecutionVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Execution not found", content = @Content)
    })
    public ResponseEntity<MissionExecutionVm> getExecutionById(
            @Parameter(description = "Unique UUID identifier of the execution", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String id
    ) {
        return ResponseEntity.ok(missionExecutionService.getExecutionById(id));
    }
}
