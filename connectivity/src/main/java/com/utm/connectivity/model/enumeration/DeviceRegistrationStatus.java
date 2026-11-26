package com.utm.connectivity.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum DeviceRegistrationStatus {
    PENDING("pending"),
    ACTIVE("active"),
    REVOKED("revoked");

    private final String value;

    DeviceRegistrationStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static DeviceRegistrationStatus fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        for (DeviceRegistrationStatus status : values()) {
            if (status.value.equalsIgnoreCase(trimmed) || status.name().equalsIgnoreCase(trimmed)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown DeviceRegistrationStatus: " + value);
    }
}
