package com.utm.emergency.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum IncidentStatus {
    ACTIVE("active"),
    PENDING_CONFIRMATION("pending_confirmation"),
    EXECUTING("executing"),
    RESOLVED("resolved"),
    REJECTED("rejected"),
    ESCALATED("escalated");

    private final String value;

    IncidentStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static IncidentStatus fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String normalized = raw.trim();
        for (IncidentStatus s : values()) {
            if (s.value.equalsIgnoreCase(normalized) || s.name().equalsIgnoreCase(normalized)) {
                return s;
            }
        }
        return null;
    }
}
