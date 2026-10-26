package com.utm.drone.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum CommandStatus {
    PENDING("pending"),
    SENT("sent"),
    ACKNOWLEDGED("acknowledged"),
    EXECUTING("executing"),
    COMPLETED("completed"),
    FAILED("failed"),
    CANCELLED("cancelled");

    private final String value;

    CommandStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static CommandStatus fromValue(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        String trimmed = value.trim();
        for (CommandStatus status : values()) {
            if (status.value.equalsIgnoreCase(trimmed) || status.name().equalsIgnoreCase(trimmed)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown CommandStatus: " + value);
    }
}
