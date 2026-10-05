package com.utm.flight.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum ConformanceStatus {
    CONFORMANT("conformant"),
    NON_CONFORMING("non_conforming"),
    CONTINGENT("contingent"),
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
        if (value == null) {
            return UNKNOWN;
        }
        for (ConformanceStatus status : ConformanceStatus.values()) {
            if (status.value.equalsIgnoreCase(value) || status.name().equalsIgnoreCase(value)) {
                return status;
            }
        }
        return UNKNOWN;
    }
}
