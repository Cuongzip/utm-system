package com.utm.flight.viewmodel;

public record AlertPostVm(
        String alertType,
        String severity,
        String flightId,
        String droneId,
        String hubId,
        String message,
        String detailsJson
) {}
