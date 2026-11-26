package com.utm.conflict.viewmodel.client;

import java.util.Map;

public record AlertTriggerPostVm(
        String alertType,
        String severity,
        String flightId,
        String droneId,
        String hubId,
        String conflictId,
        String incidentId,
        String message,
        Map<String, Object> detailsJson
) {
    public AlertTriggerPostVm(
            String alertType,
            String severity,
            String flightId,
            String droneId,
            String hubId,
            String message,
            Map<String, Object> detailsJson
    ) {
        this(alertType, severity, flightId, droneId, hubId, null, null, message, detailsJson);
    }
}

