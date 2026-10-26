package com.utm.drone.controller;

import com.utm.drone.model.enumeration.CommandStatus;
import com.utm.drone.model.enumeration.CommandType;
import com.utm.drone.service.DroneCommandService;
import com.utm.drone.viewmodel.DroneCommandListVm;
import com.utm.drone.viewmodel.DroneCommandPostVm;
import com.utm.drone.viewmodel.DroneCommandVm;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/drones/{droneId}/commands")
@RequiredArgsConstructor
@Tag(name = "Drone Command & Control", description = "Ground Control Station (GCS / C2) real-time tactical command dispatch and tracking")
public class DroneCommandController {

    private final DroneCommandService droneCommandService;

    @PostMapping
    @PreAuthorize("hasAnyRole('admin', 'hub_operator', 'pilot', 'atc')")
    @Operation(summary = "Send command to Drone", description = "Dispatch tactical flight command (takeoff, land, rtl, emergency stop, etc.) to target drone")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Command dispatched and queued successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = DroneCommandVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or parameters", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient role permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Drone not found", content = @Content)
    })
    public ResponseEntity<DroneCommandVm> sendCommand(
            @Parameter(description = "Unique UUID of the target drone", required = true)
            @PathVariable String droneId,
            @Valid @RequestBody DroneCommandPostVm postVm
    ) {
        DroneCommandVm result = droneCommandService.sendCommand(droneId, postVm);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping
    @Operation(summary = "Get command history for Drone", description = "Retrieve paginated command execution history for the given drone")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Commands retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = DroneCommandListVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "404", description = "Drone not found", content = @Content)
    })
    public ResponseEntity<DroneCommandListVm> getCommands(
            @Parameter(description = "Unique UUID of the target drone", required = true)
            @PathVariable String droneId,
            @Parameter(description = "Filter by command lifecycle status")
            @RequestParam(required = false) CommandStatus status,
            @Parameter(description = "Filter by tactical command type")
            @RequestParam(required = false) CommandType commandType,
            @Parameter(description = "Page size limit (default: 20)")
            @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Offset index (default: 0)")
            @RequestParam(defaultValue = "0") int offset
    ) {
        return ResponseEntity.ok(droneCommandService.getCommands(droneId, status, commandType, limit, offset));
    }

    @GetMapping("/{commandId}")
    @Operation(summary = "Get command details by ID", description = "Retrieve current execution progress and acknowledgment state of a specific command")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Command details retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = DroneCommandVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "404", description = "Drone or Command not found", content = @Content)
    })
    public ResponseEntity<DroneCommandVm> getCommandById(
            @Parameter(description = "Unique UUID of the target drone", required = true)
            @PathVariable String droneId,
            @Parameter(description = "Unique UUID of the command", required = true)
            @PathVariable String commandId
    ) {
        return ResponseEntity.ok(droneCommandService.getCommandById(droneId, commandId));
    }

    @PostMapping("/{commandId}/cancel")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator', 'pilot', 'atc')")
    @Operation(summary = "Cancel pending command", description = "Cancel a command before it enters execution state")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Command cancelled successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = DroneCommandVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Command cannot be cancelled (already executing or completed)", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden", content = @Content),
            @ApiResponse(responseCode = "404", description = "Drone or Command not found", content = @Content)
    })
    public ResponseEntity<DroneCommandVm> cancelCommand(
            @Parameter(description = "Unique UUID of the target drone", required = true)
            @PathVariable String droneId,
            @Parameter(description = "Unique UUID of the command", required = true)
            @PathVariable String commandId
    ) {
        return ResponseEntity.ok(droneCommandService.cancelCommand(droneId, commandId));
    }

    @GetMapping("/active")
    @Operation(summary = "Get active commands for Drone", description = "Retrieve commands that are currently in pending, sent, acknowledged, or executing state")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Active commands retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = DroneCommandVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "404", description = "Drone not found", content = @Content)
    })
    public ResponseEntity<List<DroneCommandVm>> getActiveCommands(
            @Parameter(description = "Unique UUID of the target drone", required = true)
            @PathVariable String droneId
    ) {
        return ResponseEntity.ok(droneCommandService.getActiveCommands(droneId));
    }
}
