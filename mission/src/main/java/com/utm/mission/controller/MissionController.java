package com.utm.mission.controller;

import com.utm.mission.service.MissionService;
import com.utm.mission.viewmodel.MissionListVm;
import com.utm.mission.viewmodel.MissionPostVm;
import com.utm.mission.viewmodel.MissionPutVm;
import com.utm.mission.viewmodel.MissionVm;
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

import java.util.Map;

@RestController
@RequestMapping("/api/v1/missions")
@RequiredArgsConstructor
@Tag(name = "Missions", description = "Endpoints for managing flight missions")
public class MissionController {

    private final MissionService missionService;

    @PostMapping
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'admin')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new mission", description = "Plan a new flight mission in draft status")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Mission created successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = MissionVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or scheduled time", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Departure or arrival hub not found", content = @Content)
    })
    public ResponseEntity<MissionVm> createMission(@Valid @RequestBody MissionPostVm postVm) {
        return ResponseEntity.status(HttpStatus.CREATED).body(missionService.createMission(postVm));
    }

    @GetMapping
    @Operation(summary = "Get list of missions", description = "Get paginated missions filtered by status, hubs, and schedule type")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Missions retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = MissionListVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<MissionListVm> getMissions(
            @Parameter(description = "Filter by mission status (draft, scheduled, executing, paused, completed, aborted, failed)")
            @RequestParam(required = false) String status,
            @Parameter(description = "Filter by departure hub UUID")
            @RequestParam(required = false) String departureHubId,
            @Parameter(description = "Filter by destination arrival hub UUID")
            @RequestParam(required = false) String arrivalHubId,
            @Parameter(description = "Filter by schedule type (immediate, scheduled)")
            @RequestParam(required = false) String scheduleType,
            @Parameter(description = "Page number (zero-based)", example = "0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size (records per page)", example = "20")
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(missionService.getMissions(status, departureHubId, arrivalHubId, scheduleType, size, page * size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get mission by ID", description = "Get detailed information of a mission including 3D waypoints and estimated route distance")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Mission retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = MissionVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Mission not found", content = @Content)
    })
    public ResponseEntity<MissionVm> getMissionById(
            @Parameter(description = "Unique UUID identifier of the mission", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            @PathVariable String id
    ) {
        return ResponseEntity.ok(missionService.getMissionById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'admin')")
    @Operation(summary = "Update a mission", description = "Update mission details while it is still in draft status")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Mission updated successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = MissionVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Mission not in draft status or executing", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Mission or hub not found", content = @Content)
    })
    public ResponseEntity<MissionVm> updateMission(
            @Parameter(description = "Unique UUID identifier of the mission", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            @PathVariable String id,
            @Valid @RequestBody MissionPutVm putVm
    ) {
        return ResponseEntity.ok(missionService.updateMission(id, putVm));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'admin')")
    @Operation(summary = "Delete a mission", description = "Delete a mission and all its waypoints (cannot delete while executing)")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Mission deleted successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE)
            ),
            @ApiResponse(responseCode = "400", description = "Cannot delete an executing mission", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Mission not found", content = @Content)
    })
    public ResponseEntity<Map<String, String>> deleteMission(
            @Parameter(description = "Unique UUID identifier of the mission", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            @PathVariable String id
    ) {
        missionService.deleteMission(id);
        return ResponseEntity.ok(Map.of("message", "Mission deleted successfully"));
    }

    @PostMapping("/{id}/duplicate")
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'admin')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Duplicate a mission", description = "Clone an existing mission and all its waypoints as a new draft mission")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Mission duplicated successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = MissionVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Source mission not found", content = @Content)
    })
    public ResponseEntity<MissionVm> duplicateMission(
            @Parameter(description = "Unique UUID identifier of the mission to clone", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            @PathVariable String id
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(missionService.duplicateMission(id));
    }
}
