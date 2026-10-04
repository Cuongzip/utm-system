package com.utm.simulation.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum EmergencyScenarioType {
    GPS_FAILURE("gps_failure", "GPS Signal Failure", "Sudden loss or degradation of GPS positioning signal, resulting in coordinate drift or complete signal loss.", "HIGH"),
    BATTERY_DRAIN("battery_drain", "Critical Battery Drain", "Rapid depletion of battery capacity due to cell malfunction or thermal overload.", "CRITICAL"),
    C2_LOST("c2_lost", "Command & Control Link Lost", "Loss of Command & Control (C2) communication link between the drone and Ground Control Station (GCS).", "HIGH"),
    MOTOR_FAILURE("motor_failure", "Motor Failure", "Propulsion or rotor malfunction causing loss of lift control and altitude drop.", "CRITICAL"),
    GEOFENCE_BREACH("geofence_breach", "Geofence Breach", "Drone deviates from authorized flight corridor and encroaches into restricted or prohibited airspace.", "HIGH");

    private final String value;
    private final String displayName;
    private final String description;
    private final String defaultSeverity;

    EmergencyScenarioType(String value, String displayName, String description, String defaultSeverity) {
        this.value = value;
        this.displayName = displayName;
        this.description = description;
        this.defaultSeverity = defaultSeverity;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    public String getDefaultSeverity() {
        return defaultSeverity;
    }

    @JsonCreator
    public static EmergencyScenarioType fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (EmergencyScenarioType type : values()) {
            if (type.value.equalsIgnoreCase(value) || type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown EmergencyScenarioType: " + value);
    }
}
