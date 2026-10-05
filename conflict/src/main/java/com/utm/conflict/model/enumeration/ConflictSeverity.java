package com.utm.conflict.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ConflictSeverity {
    LOW("LOW"),
    MEDIUM("MEDIUM"),
    HIGH("HIGH"),
    CRITICAL("CRITICAL");

    private final String value;

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static ConflictSeverity fromValue(String value) {
        if (value == null) return null;
        for (ConflictSeverity severity : values()) {
            if (severity.value.equalsIgnoreCase(value) || severity.name().equalsIgnoreCase(value)) {
                return severity;
            }
        }
        return null;
    }
}
