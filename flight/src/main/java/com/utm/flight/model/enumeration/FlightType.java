package com.utm.flight.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum FlightType {
    DELIVERY("delivery"),
    INSPECTION("inspection"),
    SURVEILLANCE("surveillance"),
    TRAINING("training"),
    TEST("test"),
    REPOSITIONING("repositioning");

    private final String value;

    FlightType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static FlightType fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        for (FlightType type : values()) {
            if (type.value.equalsIgnoreCase(trimmed) || type.name().equalsIgnoreCase(trimmed)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown FlightType: " + value);
    }
}
