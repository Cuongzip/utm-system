package com.utm.connectivity.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.ZonedDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TelemetryIngestClientVm(
        String droneId,
        String flightId,
        Double latitude,
        Double longitude,
        Double altitude,
        Double speed,
        Double heading,
        Double pitch,
        Double roll,
        Double yaw,
        Double batteryPercentage,
        ZonedDateTime recordedAt,
        Double signalStrength,
        String flightMode,
        String source
) {
    public TelemetryIngestClientVm(
            String droneId, String flightId, Double latitude, Double longitude, Double altitude,
            Double speed, Double heading, Double pitch, Double roll, Double yaw,
            Double batteryPercentage, ZonedDateTime recordedAt) {
        this(droneId, flightId, latitude, longitude, altitude, speed, heading, pitch, roll, yaw,
                batteryPercentage, recordedAt, null, null, null);
    }
}
