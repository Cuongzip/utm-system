package com.utm.flight.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum ConformanceStatus {
    CONFORMANT("conformant"),
    CONFORMING("conforming"),
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
        if (value == null) {
            return CONFORMING;
        }
        for (ConformanceStatus status : ConformanceStatus.values()) {
            if (status.value.equalsIgnoreCase(value) || status.name().equalsIgnoreCase(value)) {
                return status;
            }
        }
        return CONFORMING;
    }
}
