package com.utm.fleet.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AssignedByType {
    SYSTEM("system"),
    OPERATOR("operator");

    private final String value;

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static AssignedByType fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        for (AssignedByType t : values()) {
            if (t.value.equalsIgnoreCase(value) || t.name().equalsIgnoreCase(value)) {
                return t;
            }
        }
        throw new IllegalArgumentException("Unknown AssignedByType: " + value);
    }
}
