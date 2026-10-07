package com.utm.alert.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AlertStatus {
    ACTIVE("ACTIVE"),
    ACKNOWLEDGED("ACKNOWLEDGED"),
    RESOLVED("RESOLVED"),
    DISMISSED("DISMISSED");

    private final String value;

    AlertStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static AlertStatus fromValue(String value) {
        if (value == null || value.isBlank()) {
            return ACTIVE;
        }
        for (AlertStatus status : values()) {
            if (status.value.equalsIgnoreCase(value.trim())) {
                return status;
            }
        }
        return ACTIVE;
    }
}
