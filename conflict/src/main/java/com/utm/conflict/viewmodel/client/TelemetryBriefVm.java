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
        Double heading,
        Double verticalSpeed,
        String flightMode
) {
    public TelemetryBriefVm(
            String flightId, String droneId, Double latitude, Double longitude,
            Double altitude, Double speed, Double heading, Double verticalSpeed) {
        this(flightId, droneId, latitude, longitude, altitude, speed, heading, verticalSpeed, null);
    }

    public TelemetryBriefVm(
            String flightId, String droneId, Double latitude, Double longitude,
            Double altitude, Double speed, Double heading) {
        this(flightId, droneId, latitude, longitude, altitude, speed, heading, null, null);
    }

    public TelemetryBriefVm(Double latitude, Double longitude, Double altitude, Double speed, Double heading) {
        this(null, null, latitude, longitude, altitude, speed, heading, null, null);
    }
}
