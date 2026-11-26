package com.utm.mission.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum WaypointType {
    COORDINATE("coordinate"),
    HUB("hub");

    private final String value;

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static WaypointType fromValue(String value) {
        if (value == null || value.isBlank()) {
            return COORDINATE;
        }
        for (WaypointType type : values()) {
            if (type.value.equalsIgnoreCase(value.trim()) || type.name().equalsIgnoreCase(value.trim())) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown WaypointType: " + value);
    }
}
