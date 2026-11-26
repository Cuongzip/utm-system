package com.utm.emergency.viewmodel.blackbox;

import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;

import java.time.ZonedDateTime;

public record BlackboxEntryVm(
        String id,
        String flightId,
        String droneId,
        String incidentId,
        ZonedDateTime timestamp,
        Double latitude,
        Double longitude,
        Double altitudeMsl,
        Double groundSpeed,
        Double heading,
        Double batteryLevel,
        Double signalStrength,
        String commandExecuted,
        boolean emergencyActive,
        EmergencyType emergencyType,
        EmergencySeverity emergencySeverity,
        boolean isEmergencyRecording,
        ZonedDateTime createdOn
) {
}
