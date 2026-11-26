package com.utm.flight.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ConflictPostVm(
        String primaryFlightId,
        String secondaryFlightId,
        String conflictType,
        String severity,
        String hubId,
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
            String primaryFlightId,
            String secondaryFlightId,
            String conflictType,
            String severity,
            String hubId,
            Double locationLat,
            Double locationLon,
            Double altitude,
            Double separationDistance,
            Double verticalSeparation,
            Integer timeToConflictSec,
            String description
    ) {
        this(primaryFlightId, secondaryFlightId, conflictType, severity, hubId,
                locationLat, locationLon, altitude, separationDistance, verticalSeparation,
                timeToConflictSec, description, null);
    }
}

