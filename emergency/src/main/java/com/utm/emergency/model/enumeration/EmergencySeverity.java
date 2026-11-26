package com.utm.emergency.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum EmergencySeverity {
    WARNING("warning"),
    CRITICAL("critical"),
    EMERGENCY("emergency");

    private final String value;

    EmergencySeverity(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static EmergencySeverity fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String normalized = raw.trim();
        for (EmergencySeverity s : values()) {
            if (s.value.equalsIgnoreCase(normalized) || s.name().equalsIgnoreCase(normalized)) {
                return s;
            }
        }
        return null;
    }
}
