package com.utm.conflict.viewmodel;

import com.utm.conflict.model.enumeration.ConflictSeverity;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Airspace Conflict Snapshot View Model")
public record ConflictSnapshotVm(
        @Schema(description = "Snapshot record UUID")
        String id,

        @Schema(description = "Associated conflict UUID")
        String conflictId,

        @Schema(description = "Timestamp when snapshot was recorded")
        ZonedDateTime recordedAt,

        @Schema(description = "Primary flight position")
        LocationVm primaryLocation,

        @Schema(description = "Primary flight altitude in meters")
        Double primaryAlt,

        @Schema(description = "Secondary flight position (if multi-flight conflict)")
        LocationVm secondaryLocation,

        @Schema(description = "Secondary flight altitude in meters")
        Double secondaryAlt,

        @Schema(description = "Horizontal separation distance in meters")
        Double separationDistance,

        @Schema(description = "Vertical separation distance in meters")
        Double verticalSeparation,

        @Schema(description = "Time to closest point of approach in seconds")
        Integer timeToConflictSec,

        @Schema(description = "Severity at time of snapshot")
        ConflictSeverity severity
) {
}
