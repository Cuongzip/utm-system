package com.utm.connectivity.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum DeviceType {
    DRONE("drone"),
    GATEWAY("gateway"),
    GCS("gcs");

    private final String value;

    DeviceType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static DeviceType fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        for (DeviceType type : values()) {
            if (type.value.equalsIgnoreCase(trimmed) || type.name().equalsIgnoreCase(trimmed)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown DeviceType: " + value);
    }
}
