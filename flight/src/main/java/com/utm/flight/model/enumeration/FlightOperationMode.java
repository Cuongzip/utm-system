package com.utm.flight.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum FlightOperationMode {
    AUTONOMOUS("autonomous"),
    REMOTE_PILOT("remote_pilot"),
    HYBRID("hybrid");

    private final String value;

    FlightOperationMode(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static FlightOperationMode fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        for (FlightOperationMode mode : values()) {
            if (mode.value.equalsIgnoreCase(trimmed) || mode.name().equalsIgnoreCase(trimmed)) {
                return mode;
            }
        }
        throw new IllegalArgumentException("Unknown FlightOperationMode: " + value);
    }
}
