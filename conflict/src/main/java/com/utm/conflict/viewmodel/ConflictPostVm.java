package com.utm.conflict.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Payload to report or create a new conflict")
public record ConflictPostVm(
        @Schema(description = "Primary flight UUID", example = "550e8400-e29b-41d4-a716-446655440001")
        @NotBlank(message = "Primary flight ID is required")
        String primaryFlightId,

        @Schema(description = "Secondary flight UUID (if flight-to-flight conflict)", example = "550e8400-e29b-41d4-a716-446655440002")
        String secondaryFlightId,

        @Schema(description = "Conflict type (geofence_violation, loss_of_separation, airspace_breach, terrain_proximity)", example = "geofence_violation")
        String conflictType,

        @Schema(description = "Severity (warning, critical, emergency, low, medium, high)", example = "critical")
        String severity,

        @Schema(description = "Associated Hub ID", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        String hubId,

        @Schema(description = "Latitude of conflict centroid", example = "10.7780")
        Double locationLat,

        @Schema(description = "Longitude of conflict centroid", example = "106.7020")
        Double locationLon,

        @Schema(description = "Altitude in meters", example = "85.2")
        Double altitude,

        @Schema(description = "Measured horizontal separation or cross-track deviation in meters", example = "25.4")
        Double separationDistance,

        @Schema(description = "Measured vertical separation or altitude error in meters", example = "12.0")
        Double verticalSeparation,

        @Schema(description = "Estimated time to conflict in seconds", example = "0")
        Integer timeToConflictSec,

        @Schema(description = "Descriptive reason or breach violation details", example = "4D corridor breach: lateral deviation 25.4m exceeds corridor radius 15.0m")
        String description
) {
}
