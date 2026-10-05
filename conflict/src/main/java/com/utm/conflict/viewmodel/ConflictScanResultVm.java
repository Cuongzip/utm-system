package com.utm.conflict.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.ZonedDateTime;

@Schema(description = "Summary result of an airspace conflict detection scan")
public record ConflictScanResultVm(
        @Schema(description = "Total number of active airborne flights evaluated", example = "4")
        int activeFlightsCount,

        @Schema(description = "Number of pairwise interactions analyzed", example = "6")
        int evaluatedPairsCount,

        @Schema(description = "Count of new conflicts detected and created in this scan", example = "1")
        int newConflictsDetected,

        @Schema(description = "Count of ongoing conflicts updated with latest separation telemetry", example = "0")
        int existingConflictsUpdated,

        @Schema(description = "Count of previously conflicting pairs that have cleared safe separation buffer", example = "0")
        int resolvedConflictsCount,

        @Schema(description = "Scan completion timestamp")
        ZonedDateTime scannedAt
) {
}
