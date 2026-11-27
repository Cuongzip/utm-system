package com.utm.emergency.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.ZonedDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TelemetryStreamVm(
        String droneId,
        String flightId,
        Double latitude,
        Double longitude,
        Double altitude,
        Double speed,
        Double heading,
        Double batteryPercentage,
        ZonedDateTime timestamp,
        Double signalStrength,
        Double gpsHdop,
        Integer gpsSatellites,
        Double verticalSpeed,
        String flightMode
) {
    public TelemetryStreamVm(
            String droneId, String flightId, Double latitude, Double longitude,
            Double altitude, Double speed, Double heading, Double batteryPercentage,
            ZonedDateTime timestamp) {
        this(droneId, flightId, latitude, longitude, altitude, speed, heading,
                batteryPercentage, timestamp, null, null, null, null, null);
    }

    public TelemetryStreamVm(
            String droneId, String flightId, Double latitude, Double longitude,
            Double altitude, Double speed, Double heading, Double batteryPercentage,
            ZonedDateTime timestamp, Double signalStrength, Double gpsHdop,
            Integer gpsSatellites, Double verticalSpeed) {
        this(droneId, flightId, latitude, longitude, altitude, speed, heading,
                batteryPercentage, timestamp, signalStrength, gpsHdop, gpsSatellites, verticalSpeed, null);
    }
}
