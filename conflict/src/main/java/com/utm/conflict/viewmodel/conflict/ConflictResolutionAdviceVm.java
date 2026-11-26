package com.utm.conflict.viewmodel.conflict;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.List;

@Schema(description = "Tactical conflict resolution advisory with ranked deconfliction maneuvers")
public record ConflictResolutionAdviceVm(
        @Schema(description = "Conflict UUID")
        String conflictId,

        @Schema(description = "Primary flight ID")
        String primaryFlightId,

        @Schema(description = "Secondary flight ID (null for single-flight airspace conflict)")
        String secondaryFlightId,

        @Schema(description = "Conflict classification type")
        String conflictType,

        @Schema(description = "Current conflict severity")
        String severity,

        @Schema(description = "Ranked list of recommended resolution options")
        List<ResolutionAdviceOptionVm> options,

        @Schema(description = "Timestamp when this advisory was generated")
        ZonedDateTime generatedAt
) {
}
