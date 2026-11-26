package com.utm.conflict.viewmodel.conflict;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

import java.util.Map;

@Schema(description = "Payload to report or create a new conflict")
public record ConflictPostVm(
        @Schema(description = "Primary flight UUID")
        @NotBlank(message = "Primary flight ID is required")
        String primaryFlightId,
        String secondaryFlightId,
        String conflictType,
        String severity,
        String hubId,
        String airspaceZoneId,
        Double locationLat,
        Double locationLon,
        Double altitude,
        Double separationDistance,
        Double verticalSeparation,
        Integer timeToConflictSec,
        String description,
        Map<String, Object> data
) {
    public ConflictPostVm(
            String primaryFlightId, String secondaryFlightId, String conflictType, String severity,
            String hubId, String airspaceZoneId, Double locationLat, Double locationLon,
            Double altitude, Double separationDistance, Double verticalSeparation,
            Integer timeToConflictSec, String description) {
        this(primaryFlightId, secondaryFlightId, conflictType, severity, hubId, airspaceZoneId,
                locationLat, locationLon, altitude, separationDistance, verticalSeparation,
                timeToConflictSec, description, null);
    }

    public ConflictPostVm(
            String primaryFlightId, String secondaryFlightId, String conflictType, String severity,
            String hubId, Double locationLat, Double locationLon, Double altitude,
            Double separationDistance, Double verticalSeparation, Integer timeToConflictSec,
            String description) {
        this(primaryFlightId, secondaryFlightId, conflictType, severity, hubId, null, locationLat, locationLon,
                altitude, separationDistance, verticalSeparation, timeToConflictSec, description, null);
    }
}
