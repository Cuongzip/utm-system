package com.utm.emergency.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum RootCause {
    EQUIPMENT("equipment"),
    WEATHER("weather"),
    PILOT_ERROR("pilot_error"),
    SOFTWARE("software"),
    EXTERNAL("external"),
    UNKNOWN("unknown");

    private final String value;

    RootCause(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static RootCause fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String normalized = raw.trim();
        for (RootCause rc : values()) {
            if (rc.value.equalsIgnoreCase(normalized) || rc.name().equalsIgnoreCase(normalized)) {
                return rc;
            }
        }
        return null;
    }
}
