package com.utm.conflict.viewmodel.conflict;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Detected 4D separation conflict against an existing scheduled or active flight")
public record TrajectoryConflictDetailVm(
        @Schema(description = "ID of the conflicting flight")
        String conflictingFlightId,

        @Schema(description = "Flight number of the conflicting flight")
        String conflictingFlightNumber,

        @Schema(description = "Minimum horizontal separation in meters")
        double horizontalDistanceM,

        @Schema(description = "Minimum vertical separation in meters")
        double verticalDistanceM,

        @Schema(description = "Estimated timestamp of closest point of approach")
        ZonedDateTime conflictTimestamp,

        @Schema(description = "Conflict midpoint latitude")
        double latitude,

        @Schema(description = "Conflict midpoint longitude")
        double longitude,

        @Schema(description = "Conflict midpoint altitude in meters")
        double altitude,

        @Schema(description = "Predicted conflict severity")
        String severity,

        @Schema(description = "Human-readable conflict summary")
        String reason
) {
}
