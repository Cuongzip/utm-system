package com.utm.emergency.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AlertPostVm(
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
}
