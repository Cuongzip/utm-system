package com.utm.alert.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AlertSeverity {
    LOW("LOW"),
    MEDIUM("MEDIUM"),
    HIGH("HIGH"),
    CRITICAL("CRITICAL");

    private final String value;

    AlertSeverity(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static AlertSeverity fromValue(String value) {
        if (value == null || value.isBlank()) {
            return MEDIUM;
        }
        for (AlertSeverity severity : values()) {
            if (severity.value.equalsIgnoreCase(value.trim())) {
                return severity;
            }
        }
        return MEDIUM;
    }
}
