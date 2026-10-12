package com.utm.flight.viewmodel;

import com.fasterxml.jackson.annotation.JsonInclude;

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
        String description
) {
}
