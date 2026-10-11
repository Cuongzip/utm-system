package com.utm.mission.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MissionScheduleType {
    IMMEDIATE("immediate"),
    SCHEDULED("scheduled");

    private final String value;

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static MissionScheduleType fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        for (MissionScheduleType type : values()) {
            if (type.value.equalsIgnoreCase(value) || type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown MissionScheduleType: " + value);
    }
}
