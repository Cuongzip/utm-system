package com.utm.hub.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum HubStatus {
    ACTIVE("active"),
    MAINTENANCE("maintenance"),
    CLOSED("closed");

    private final String value;

    HubStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static HubStatus fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (HubStatus status : values()) {
            if (status.value.equalsIgnoreCase(value) || status.name().equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown HubStatus: " + value);
    }
}
