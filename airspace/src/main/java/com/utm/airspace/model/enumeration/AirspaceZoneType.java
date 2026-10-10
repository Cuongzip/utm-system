package com.utm.airspace.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AirspaceZoneType {
    NO_FLY_ZONE("no_fly_zone"),
    RESTRICTED("restricted"),
    HUB_CORRIDOR("hub_corridor"),
    WARNING("warning");

    private final String value;

    AirspaceZoneType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static AirspaceZoneType fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (AirspaceZoneType type : values()) {
            if (type.value.equalsIgnoreCase(value) || type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        if ("prohibited".equalsIgnoreCase(value)) {
            return NO_FLY_ZONE;
        }
        if ("corridor".equalsIgnoreCase(value)) {
            return HUB_CORRIDOR;
        }
        throw new IllegalArgumentException("Unknown AirspaceZoneType: " + value);
    }
}
