package com.utm.conflict.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.ZonedDateTime;
import java.util.Map;

@Schema(description = "Airspace Conflict Detail View Model")
public record ConflictVm(
        @Schema(description = "Unique UUID of the conflict record", example = "550e8400-e29b-41d4-a716-446655440000")
        String id,

        @Schema(description = "Conflict type (separation_minimum, head_on, convergence, airspace_breach)", example = "separation_minimum")
        String conflictType,

        @Schema(description = "Severity level (LOW, MEDIUM, HIGH, CRITICAL)", example = "HIGH")
        String severity,

        @Schema(description = "Current conflict lifecycle status (detected, notified, resolving, resolved)", example = "detected")
        String status,

        @Schema(description = "UUID identifier of primary flight involved", example = "550e8400-e29b-41d4-a716-446655440001")
        String primaryFlightId,

        @Schema(description = "UUID identifier of secondary flight involved", example = "550e8400-e29b-41d4-a716-446655440002")
        String secondaryFlightId,

        @Schema(description = "Associated Hub UUID identifier", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        String hubId,

        @Schema(description = "Timestamp when the conflict was detected")
        ZonedDateTime detectedAt,

        @Schema(description = "Detection source / mechanism (automated_telemetry, manual)", example = "automated_telemetry")
        String detectionMethod,

        @Schema(description = "Geographic centroid of conflict")
        LocationVm location,

        @Schema(description = "Altitude of conflict event in meters", example = "120.0")
        Double altitude,

        @Schema(description = "Measured horizontal separation distance in meters", example = "85.4")
        Double separationDistance,

        @Schema(description = "Measured vertical separation distance in meters", example = "12.0")
        Double verticalSeparation,

        @Schema(description = "Calculated time to closest point of approach / conflict in seconds", example = "45")
        Integer timeToConflictSec,

        @Schema(description = "Detailed conflict explanation", example = "Loss of separation between flight FL-001 and FL-002")
        String description,

        @Schema(description = "Applied resolution strategy", example = "altitude_change")
        String resolutionStrategy,

        @Schema(description = "Detailed resolution directives")
        Map<String, Object> resolutionActions,

        @Schema(description = "Timestamp when marked resolved")
        ZonedDateTime resolvedAt,

        @Schema(description = "User or system agent that resolved the conflict")
        String resolvedBy,

        @Schema(description = "Record creation timestamp")
        ZonedDateTime createdOn,

        @Schema(description = "User who created this record")
        String createdBy,

        @Schema(description = "Last modification timestamp")
        ZonedDateTime lastModifiedOn,

        @Schema(description = "User who last modified this record")
        String lastModifiedBy
) {
}
