package com.utm.mission.controller;

import com.utm.mission.service.WaypointService;
import com.utm.mission.viewmodel.WaypointPostVm;
import com.utm.mission.viewmodel.WaypointPutVm;
import com.utm.mission.viewmodel.WaypointReorderVm;
import com.utm.mission.viewmodel.WaypointVm;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/missions/{missionId}/waypoints")
@RequiredArgsConstructor
@Tag(name = "Waypoints", description = "Endpoints for managing mission 3D trajectory waypoints")
public class WaypointController {

    private final WaypointService waypointService;

    @PostMapping
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'admin')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a waypoint to mission", description = "Append a new 3D trajectory waypoint to the mission route")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Waypoint added successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = WaypointVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid coordinates or mission not in draft status", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Mission not found", content = @Content)
    })
    public ResponseEntity<WaypointVm> addWaypoint(
            @Parameter(description = "Unique UUID identifier of the mission", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            @PathVariable String missionId,
            @Valid @RequestBody WaypointPostVm postVm
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(waypointService.addWaypoint(missionId, postVm));
    }

    @GetMapping
    @Operation(summary = "Get mission waypoints", description = "Get all waypoints of a mission ordered by sequence ascending")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Waypoints retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            array = @ArraySchema(schema = @Schema(implementation = WaypointVm.class))
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Mission not found", content = @Content)
    })
    public ResponseEntity<List<WaypointVm>> getWaypoints(
            @Parameter(description = "Unique UUID identifier of the mission", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            @PathVariable String missionId
    ) {
        return ResponseEntity.ok(waypointService.getWaypoints(missionId));
    }

    @PutMapping("/{waypointId}")
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'admin')")
    @Operation(summary = "Update a waypoint", description = "Update waypoint parameters within a draft mission")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Waypoint updated successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = WaypointVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid payload or mission not in draft status", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Mission or waypoint not found", content = @Content)
    })
    public ResponseEntity<WaypointVm> updateWaypoint(
            @Parameter(description = "Unique UUID identifier of the mission", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            @PathVariable String missionId,
            @Parameter(description = "Unique UUID identifier of the waypoint", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String waypointId,
            @Valid @RequestBody WaypointPutVm putVm
    ) {
        return ResponseEntity.ok(waypointService.updateWaypoint(missionId, waypointId, putVm));
    }

    @DeleteMapping("/{waypointId}")
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'admin')")
    @Operation(summary = "Delete a waypoint", description = "Delete a waypoint and automatically re-index the sequence of remaining waypoints")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Waypoint removed and sequence re-indexed",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE)
            ),
            @ApiResponse(responseCode = "400", description = "Mission not in draft status", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Mission or waypoint not found", content = @Content)
    })
    public ResponseEntity<Map<String, String>> deleteWaypoint(
            @Parameter(description = "Unique UUID identifier of the mission", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            @PathVariable String missionId,
            @Parameter(description = "Unique UUID identifier of the waypoint", example = "550e8400-e29b-41d4-a716-446655440000")
            @PathVariable String waypointId
    ) {
        waypointService.deleteWaypoint(missionId, waypointId);
        return ResponseEntity.ok(Map.of("message", "Waypoint removed and sequence re-indexed"));
    }

    @PostMapping("/reorder")
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'admin')")
    @Operation(summary = "Reorder waypoints", description = "Reorder waypoint sequence numbers in a single atomic transaction")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Waypoints reordered successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            array = @ArraySchema(schema = @Schema(implementation = WaypointVm.class))
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid reorder payload or mission not in draft status", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Mission not found", content = @Content)
    })
    public ResponseEntity<List<WaypointVm>> reorderWaypoints(
            @Parameter(description = "Unique UUID identifier of the mission", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
            @PathVariable String missionId,
            @Valid @RequestBody WaypointReorderVm reorderVm
    ) {
        return ResponseEntity.ok(waypointService.reorderWaypoints(missionId, reorderVm));
    }
}
