package com.utm.flight.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum ConformanceStatus {
    CONFORMANT("conformant"),
    CONTINGENT("contingent"),
    NON_CONFORMING("non_conforming"),
    UNKNOWN("unknown");

    private final String value;

    ConformanceStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static ConformanceStatus fromValue(String value) {
        if (value == null || value.isBlank()) {
            return CONFORMANT;
        }
        String trimmed = value.trim();
        if ("conforming".equalsIgnoreCase(trimmed)) {
            return CONFORMANT;
        }
        for (ConformanceStatus status : ConformanceStatus.values()) {
            if (status.value.equalsIgnoreCase(trimmed) || status.name().equalsIgnoreCase(trimmed)) {
                return status;
            }
        }
        return CONFORMANT;
    }
}
