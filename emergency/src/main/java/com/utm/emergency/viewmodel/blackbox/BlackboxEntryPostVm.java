package com.utm.emergency.viewmodel.blackbox;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.ZonedDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record BlackboxEntryPostVm(
        String flightId,
        @NotBlank String droneId,
        String incidentId,
        @NotNull ZonedDateTime timestamp,
        @NotNull Double latitude,
        @NotNull Double longitude,
        @NotNull Double altitudeMsl,
        @NotNull Double groundSpeed,
        @NotNull Double heading,
        @NotNull Double batteryLevel,
        @NotNull Double signalStrength,
        String commandExecuted,
        Boolean emergencyActive,
        EmergencyType emergencyType,
        EmergencySeverity emergencySeverity,
        Boolean isEmergencyRecording
) {
}
