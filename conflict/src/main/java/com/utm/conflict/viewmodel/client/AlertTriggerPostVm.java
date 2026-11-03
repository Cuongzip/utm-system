package com.utm.conflict.viewmodel.client;

public record AlertTriggerPostVm(
        String alertType,
        String severity,
        String flightId,
        String droneId,
        String hubId,
        String message,
        String detailsJson
) {
}

