package com.utm.mission.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ExecutionMode {
    SAME_DRONE_SEQUENTIAL("same_drone_sequential"),
    MULTI_DRONE_RELAY("multi_drone_relay");

    private final String value;

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static ExecutionMode fromValue(String value) {
        if (value == null || value.isBlank()) {
            return SAME_DRONE_SEQUENTIAL;
        }
        for (ExecutionMode mode : values()) {
            if (mode.value.equalsIgnoreCase(value.trim()) || mode.name().equalsIgnoreCase(value.trim())) {
                return mode;
            }
        }
        throw new IllegalArgumentException("Unknown ExecutionMode: " + value);
    }
}
