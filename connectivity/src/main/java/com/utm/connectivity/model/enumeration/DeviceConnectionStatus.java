package com.utm.connectivity.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum DeviceConnectionStatus {
    OFFLINE("offline"),
    ONLINE("online"),
    CONNECTING("connecting");

    private final String value;

    DeviceConnectionStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static DeviceConnectionStatus fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (DeviceConnectionStatus status : values()) {
            if (status.value.equalsIgnoreCase(value) || status.name().equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown DeviceConnectionStatus: " + value);
    }
}
