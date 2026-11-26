package com.utm.emergency.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum EmergencyType {
    BATTERY_LOW("battery_low"),
    BATTERY_CRITICAL("battery_critical"),
    BATTERY_RAPID_DISCHARGE("battery_rapid_discharge"),
    SIGNAL_WEAK("signal_weak"),
    SIGNAL_LOST("signal_lost"),
    GEOFENCE_WARNING("geofence_warning"),
    GEOFENCE_BREACH("geofence_breach"),
    COLLISION_AIRCRAFT("collision_aircraft"),
    COLLISION_OBSTACLE("collision_obstacle"),
    WEATHER_WIND("weather_wind"),
    WEATHER_VISIBILITY("weather_visibility"),
    MOTOR_ANOMALY("motor_anomaly"),
    MOTOR_FAILURE("motor_failure"),
    GPS_DEGRADED("gps_degraded"),
    GPS_LOST("gps_lost");

    private final String value;

    EmergencyType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static EmergencyType fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String normalized = raw.trim();
        for (EmergencyType t : values()) {
            if (t.value.equalsIgnoreCase(normalized)
                    || t.name().equalsIgnoreCase(normalized)
                    || t.name().replace("_", "").equalsIgnoreCase(normalized.replace("_", ""))) {
                return t;
            }
        }
        return null;
    }
}
