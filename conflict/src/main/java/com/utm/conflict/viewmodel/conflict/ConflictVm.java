package com.utm.conflict.viewmodel.conflict;

import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.model.enumeration.ConflictStatus;
import com.utm.conflict.model.enumeration.ConflictType;
import com.utm.conflict.model.enumeration.ResolutionStrategy;
import com.utm.conflict.viewmodel.client.LocationVm;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.Map;

@Schema(description = "Airspace Conflict Detail View Model")
public record ConflictVm(
        String id,
        ConflictType conflictType,
        ConflictSeverity severity,
        ConflictStatus status,
        String primaryFlightId,
        String secondaryFlightId,
        String hubId,
        String airspaceZoneId,
        ZonedDateTime detectedAt,
        String detectionMethod,
        LocationVm location,
        Double altitude,
        Double separationDistance,
        Double minSeparationDistance,
        Double verticalSeparation,
        ConflictSeverity maxSeverity,
        Integer timeToConflictSec,
        String description,
        ResolutionStrategy resolutionStrategy,
        Map<String, Object> resolutionActions,
        ZonedDateTime resolvedAt,
        String resolvedBy,
        ZonedDateTime createdOn,
        String createdBy,
        ZonedDateTime lastModifiedOn,
        String lastModifiedBy,
        Map<String, Object> data
) {
    public ConflictVm(
            String id, ConflictType conflictType, ConflictSeverity severity, ConflictStatus status,
            String primaryFlightId, String secondaryFlightId, String hubId, String airspaceZoneId,
            ZonedDateTime detectedAt, String detectionMethod, LocationVm location, Double altitude,
            Double separationDistance, Double minSeparationDistance, Double verticalSeparation,
            ConflictSeverity maxSeverity, Integer timeToConflictSec, String description,
            ResolutionStrategy resolutionStrategy, Map<String, Object> resolutionActions,
            ZonedDateTime resolvedAt, String resolvedBy, ZonedDateTime createdOn, String createdBy,
            ZonedDateTime lastModifiedOn, String lastModifiedBy) {
        this(id, conflictType, severity, status, primaryFlightId, secondaryFlightId, hubId, airspaceZoneId,
                detectedAt, detectionMethod, location, altitude, separationDistance, minSeparationDistance,
                verticalSeparation, maxSeverity, timeToConflictSec, description, resolutionStrategy,
                resolutionActions, resolvedAt, resolvedBy, createdOn, createdBy, lastModifiedOn, lastModifiedBy, null);
    }

    public ConflictVm(
            String id, ConflictType conflictType, ConflictSeverity severity, ConflictStatus status,
            String primaryFlightId, String secondaryFlightId, String hubId, ZonedDateTime detectedAt,
            String detectionMethod, LocationVm location, Double altitude, Double separationDistance,
            Double minSeparationDistance, Double verticalSeparation, ConflictSeverity maxSeverity,
            Integer timeToConflictSec, String description, ResolutionStrategy resolutionStrategy,
            Map<String, Object> resolutionActions, ZonedDateTime resolvedAt, String resolvedBy,
            ZonedDateTime createdOn, String createdBy, ZonedDateTime lastModifiedOn, String lastModifiedBy) {
        this(id, conflictType, severity, status, primaryFlightId, secondaryFlightId, hubId, null, detectedAt,
                detectionMethod, location, altitude, separationDistance, minSeparationDistance, verticalSeparation,
                maxSeverity, timeToConflictSec, description, resolutionStrategy, resolutionActions, resolvedAt,
                resolvedBy, createdOn, createdBy, lastModifiedOn, lastModifiedBy, null);
    }
}
