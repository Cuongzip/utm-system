package com.utm.drone.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum CommunicationProtocol {
    MAVLINK("mavlink"),
    DJI_SDK("dji_sdk"),
    CUSTOM_API("custom_api"),
    REST_API("rest_api"),
    WEBSOCKET("websocket");

    private final String value;

    CommunicationProtocol(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static CommunicationProtocol fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        for (CommunicationProtocol p : values()) {
            if (p.value.equalsIgnoreCase(trimmed) || p.name().equalsIgnoreCase(trimmed)) {
                return p;
            }
        }
        throw new IllegalArgumentException("Unknown CommunicationProtocol: " + value);
    }
}
