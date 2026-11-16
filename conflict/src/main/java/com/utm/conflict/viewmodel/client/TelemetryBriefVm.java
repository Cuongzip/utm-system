package com.utm.conflict.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TelemetryBriefVm(
        String flightId,
        String droneId,
        Double latitude,
        Double longitude,
        Double altitude,
        Double speed,
        Double heading
) {
    public TelemetryBriefVm(Double latitude, Double longitude, Double altitude, Double speed, Double heading) {
        this(null, null, latitude, longitude, altitude, speed, heading);
    }
}

