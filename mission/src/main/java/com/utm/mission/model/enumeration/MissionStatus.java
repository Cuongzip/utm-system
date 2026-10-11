package com.utm.mission.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MissionStatus {
    DRAFT("draft"),
    SCHEDULED("scheduled"),
    EXECUTING("executing"),
    PAUSED("paused"),
    COMPLETED("completed"),
    ABORTED("aborted"),
    FAILED("failed");

    private final String value;

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static MissionStatus fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        for (MissionStatus status : values()) {
            if (status.value.equalsIgnoreCase(value) || status.name().equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown MissionStatus: " + value);
    }
}
