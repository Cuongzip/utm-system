package com.utm.conflict.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ConflictType {
    LOSS_OF_SEPARATION("loss_of_separation"),
    GEOFENCE_VIOLATION("geofence_violation"),
    AIRSPACE_BREACH("airspace_breach"),
    TERRAIN_PROXIMITY("terrain_proximity"),
    SEPARATION_MINIMUM("separation_minimum"),
    HEAD_ON("head_on"),
    CONVERGENCE("convergence");

    private final String value;

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static ConflictType fromValue(String value) {
        if (value == null) return null;
        for (ConflictType type : values()) {
            if (type.value.equalsIgnoreCase(value) || type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        return null;
    }
}
