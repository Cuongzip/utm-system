package com.utm.drone.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum DroneStatus {
    AVAILABLE("available"),
    IN_MISSION("in_mission"),
    MAINTENANCE("maintenance"),
    RETIRED("retired");

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
        if (value == null) {
            return null;
        }
        for (DroneStatus status : values()) {
            if (status.value.equalsIgnoreCase(value) || status.name().equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown DroneStatus: " + value);
    }
}
