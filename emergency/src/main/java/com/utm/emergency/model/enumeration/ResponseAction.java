package com.utm.emergency.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ResponseAction {
    RTH("RTH"),
    LAND("LAND"),
    HOVER("HOVER"),
    DIVERT("DIVERT"),
    DESCEND("DESCEND"),
    CLIMB("CLIMB"),
    ESTOP("ESTOP"),
    NONE("NONE");

    private final String value;

    ResponseAction(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static ResponseAction fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String normalized = raw.trim();
        for (ResponseAction a : values()) {
            if (a.value.equalsIgnoreCase(normalized) || a.name().equalsIgnoreCase(normalized)) {
                return a;
            }
        }
        return null;
    }
}
