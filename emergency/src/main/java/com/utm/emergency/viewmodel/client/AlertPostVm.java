package com.utm.emergency.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AlertPostVm(
        String droneId,
        String flightId,
        String alertType,
        String severity,
        String message,
        String status) {
}
