package com.utm.emergency.viewmodel.blackbox;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.ZonedDateTime;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record BlackboxEntryPostVm(
        @NotBlank String flightId,
        @NotBlank String droneId,
        String incidentId,
        @NotNull ZonedDateTime timestamp,
        @NotNull Double latitude,
        @NotNull Double longitude,
        @NotNull Double altitudeMsl,
        Double altitudeAgl,
        Double roll,
        Double pitch,
        Double yaw,
        @NotNull Double groundSpeed,
        Double verticalSpeed,
        @NotNull Double heading,
        @NotNull Double batteryLevel,
        Double batteryVoltage,
        Double batteryCurrent,
        @NotNull Double signalStrength,
        Integer gpsSatellites,
        Double gpsHdop,
        List<Double> motorRpm,
        List<Double> motorTemps,
        String commandReceived,
        String commandExecuted,
        Boolean emergencyActive,
        String emergencyType,
        String emergencySeverity,
        String flightMode,
        Double windSpeed,
        Double windDirection,
        Double temperature,
        Double humidity,
        Boolean isEmergencyRecording
) {
}