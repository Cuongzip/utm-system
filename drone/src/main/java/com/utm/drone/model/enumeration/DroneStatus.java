package com.utm.drone.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum DroneStatus {
    AVAILABLE("available"),
    IN_FLIGHT("in_flight"),
    MAINTENANCE("maintenance"),
    CHARGING("charging"),
    OFFLINE("offline");

    private final String value;

    DroneStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static DroneStatus fromValue(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        String trimmed = value.trim();
        for (DroneStatus status : values()) {
            if (status.value.equalsIgnoreCase(trimmed) || status.name().equalsIgnoreCase(trimmed)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown DroneStatus: " + value);
    }
}
