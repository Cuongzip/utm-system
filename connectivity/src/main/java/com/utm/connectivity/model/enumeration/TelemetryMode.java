package com.utm.connectivity.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TelemetryMode {
    IDLE("idle", 0.033, 30_000, "Drone on ground", 0),
    NORMAL("normal", 0.5, 2_000, "Standard flight", 1),
    ENHANCED("enhanced", 2.0, 500, "Near geofence or traffic", 2),
    EMERGENCY("emergency", 10.0, 100, "Active incident", 3);

    private final String value;
    private final double rateHz;
    private final int intervalMs;
    private final String description;
    private final int priority;

    TelemetryMode(String value, double rateHz, int intervalMs, String description, int priority) {
        this.value = value;
        this.rateHz = rateHz;
        this.intervalMs = intervalMs;
        this.description = description;
        this.priority = priority;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public double getRateHz() {
        return rateHz;
    }

    public int getIntervalMs() {
        return intervalMs;
    }

    public String getDescription() {
        return description;
    }

    public int getPriority() {
        return priority;
    }

    @JsonCreator
    public static TelemetryMode fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        for (TelemetryMode mode : values()) {
            if (mode.value.equalsIgnoreCase(trimmed) || mode.name().equalsIgnoreCase(trimmed)) {
                return mode;
            }
        }
        throw new IllegalArgumentException("Unknown TelemetryMode: " + value);
    }
}
