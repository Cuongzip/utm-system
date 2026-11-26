package com.utm.mission.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LegStatus {
    PLANNED("planned"),
    AUTHORIZED("authorized"),
    ACTIVE("active"),
    COMPLETED("completed"),
    DIVERTED("diverted"),
    EMERGENCY_LANDING("emergency_landing"),
    CANCELLED("cancelled"),
    FAILED("failed");

    private final String value;

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static LegStatus fromValue(String value) {
        if (value == null || value.isBlank()) {
            return PLANNED;
        }
        for (LegStatus status : values()) {
            if (status.value.equalsIgnoreCase(value.trim()) || status.name().equalsIgnoreCase(value.trim())) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown LegStatus: " + value);
    }
}
