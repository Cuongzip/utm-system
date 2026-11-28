package com.utm.simulation.viewmodel.client;

import java.time.ZonedDateTime;

public record TelemetryPushVm(
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
        Double verticalSpeed,
        Double signalStrength,
        Double gpsHdop,
        Integer gpsSatellites,
        String flightMode,
        String source,
        Double altitudeAgl,
        Double batteryVoltage,
        Double batteryTemperature,
        Double batteryDischargeRate
) {
    public TelemetryPushVm(
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
            Double verticalSpeed,
            Double signalStrength,
            Double gpsHdop,
            Integer gpsSatellites,
            String flightMode,
            String source) {
        this(droneId, flightId, latitude, longitude, altitude, speed, heading, pitch, roll, yaw,
                batteryPercentage, recordedAt, verticalSpeed, signalStrength, gpsHdop, gpsSatellites,
                flightMode, source, altitude, null, null, null);
    }

    public TelemetryPushVm(
            String droneId, String flightId, Double latitude, Double longitude,
            Double altitude, Double speed, Double heading, Double pitch, Double roll,
            Double yaw, Double batteryPercentage, ZonedDateTime recordedAt) {
        this(droneId, flightId, latitude, longitude, altitude, speed, heading, pitch, roll, yaw,
                batteryPercentage, recordedAt, 0.0, 95.0, 0.9, 14, "AUTONOMOUS", "simulation",
                altitude, null, null, null);
    }

    public TelemetryPushVm(
            String droneId, String flightId, Double latitude, Double longitude,
            Double altitude, Double speed, Double heading, Double pitch, Double roll,
            Double yaw, Double batteryPercentage) {
        this(droneId, flightId, latitude, longitude, altitude, speed, heading, pitch, roll, yaw,
                batteryPercentage, ZonedDateTime.now(), 0.0, 95.0, 0.9, 14, "AUTONOMOUS", "simulation",
                altitude, null, null, null);
    }
}
