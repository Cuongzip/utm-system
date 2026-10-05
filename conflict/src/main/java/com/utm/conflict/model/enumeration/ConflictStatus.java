package com.utm.conflict.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ConflictStatus {
    DETECTED("detected"),
    NOTIFIED("notified"),
    RESOLVING("resolving"),
    RESOLVED("resolved");

    private final String value;

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static ConflictStatus fromValue(String value) {
        if (value == null) return null;
        for (ConflictStatus status : values()) {
            if (status.value.equalsIgnoreCase(value) || status.name().equalsIgnoreCase(value)) {
                return status;
            }
        }
        return null;
    }
}
