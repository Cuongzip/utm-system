package com.utm.simulation.viewmodel;

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
        Double batteryPercentage
) {
}
