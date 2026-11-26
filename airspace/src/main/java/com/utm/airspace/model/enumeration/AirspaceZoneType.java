package com.utm.airspace.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AirspaceZoneType {
    NO_FLY_ZONE("no_fly_zone"),
    PROHIBITED("prohibited"),
    RESTRICTED("restricted"),
    CONTROLLED("controlled"),
    HUB_CORRIDOR("hub_corridor"),
    HUB_ZONE("hub_zone"),
    WARNING("warning"),
    TEMPORARY_RESTRICTION("temporary_restriction"),
    EMERGENCY_EXCLUSION("emergency_exclusion");

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
        if ("corridor".equalsIgnoreCase(value)) {
            return HUB_CORRIDOR;
        }
        throw new IllegalArgumentException("Unknown AirspaceZoneType: " + value);
    }
}
