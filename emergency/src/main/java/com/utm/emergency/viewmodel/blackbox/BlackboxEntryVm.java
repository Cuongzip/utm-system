package com.utm.emergency.viewmodel.blackbox;

import java.time.ZonedDateTime;
import java.util.List;

public record BlackboxEntryVm(
        String id,
        String flightId,
        String droneId,
        String incidentId,
        ZonedDateTime timestamp,
        Double latitude,
        Double longitude,
        Double altitudeMsl,
        Double altitudeAgl,
        Double roll,
        Double pitch,
        Double yaw,
        Double groundSpeed,
        Double verticalSpeed,
        Double heading,
        Double batteryLevel,
        Double batteryVoltage,
        Double batteryCurrent,
        Double signalStrength,
        Integer gpsSatellites,
        Double gpsHdop,
        List<Double> motorRpm,
        List<Double> motorTemps,
        String commandReceived,
        String commandExecuted,
        boolean emergencyActive,
        String emergencyType,
        String emergencySeverity,
        String flightMode,
        Double windSpeed,
        Double windDirection,
        Double temperature,
        Double humidity,
        boolean isEmergencyRecording,
        ZonedDateTime createdOn
) {
}