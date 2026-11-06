package com.utm.emergency.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum EmergencySeverity {
    warning,
    critical,
    emergency;

    @JsonCreator
    public static EmergencySeverity fromString(String value) {
        if (value == null) return null;
        for (EmergencySeverity s : values()) {
            if (s.name().equalsIgnoreCase(value)) {
                return s;
            }
        }
        return null;
    }
}