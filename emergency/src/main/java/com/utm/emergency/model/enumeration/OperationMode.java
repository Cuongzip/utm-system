package com.utm.emergency.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum OperationMode {
    AUTO("auto"),
    SUPERVISED("supervised");

    private final String value;

    OperationMode(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static OperationMode fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String normalized = raw.trim();
        for (OperationMode m : values()) {
            if (m.value.equalsIgnoreCase(normalized) || m.name().equalsIgnoreCase(normalized)) {
                return m;
            }
        }
        return null;
    }
}
