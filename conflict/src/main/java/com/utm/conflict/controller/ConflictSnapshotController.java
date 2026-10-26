package com.utm.conflict.controller;

import com.utm.conflict.service.ConflictSnapshotService;
import com.utm.conflict.viewmodel.ConflictSnapshotVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/conflicts/{conflictId}/snapshots")
@RequiredArgsConstructor
@Tag(name = "Conflict Snapshots", description = "Endpoints for retrieving periodic proximity and trajectory snapshots recorded during active conflict lifecycle")
public class ConflictSnapshotController {

    private final ConflictSnapshotService conflictSnapshotService;

    @GetMapping
    @PreAuthorize("hasAnyRole('admin', 'atc', 'hub_operator', 'pilot')")
    @Operation(summary = "Get conflict snapshots", description = "Retrieve periodic proximity and trajectory snapshots recorded during active conflict lifecycle")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Conflict snapshots retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            array = @ArraySchema(schema = @Schema(implementation = ConflictSnapshotVm.class))
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Conflict not found", content = @Content)
    })
    public ResponseEntity<List<ConflictSnapshotVm>> getSnapshotsByConflictId(
            @Parameter(description = "Unique UUID identifier of the conflict", required = true)
            @PathVariable String conflictId
    ) {
        return ResponseEntity.ok(conflictSnapshotService.getSnapshotsByConflictId(conflictId));
    }
}
