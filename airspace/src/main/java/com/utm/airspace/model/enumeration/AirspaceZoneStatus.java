package com.utm.airspace.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AirspaceZoneStatus {
    ACTIVE("active"),
    INACTIVE("inactive");

    private final String value;

    AirspaceZoneStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static AirspaceZoneStatus fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (AirspaceZoneStatus status : values()) {
            if (status.value.equalsIgnoreCase(value) || status.name().equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown AirspaceZoneStatus: " + value);
    }
}
