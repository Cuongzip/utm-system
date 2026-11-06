package com.utm.emergency.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum EmergencyType {
    battery_low,
    battery_critical,
    battery_rapid_discharge,
    signal_weak,
    signal_lost,
    geofence_warning,
    geofence_breach,
    collision_aircraft,
    collision_obstacle,
    weather_wind,
    weather_visibility,
    motor_anomaly,
    motor_failure,
    gps_degraded,
    gps_lost;

    @JsonCreator
    public static EmergencyType fromString(String value) {
        if (value == null) return null;
        for (EmergencyType t : values()) {
            if (t.name().equalsIgnoreCase(value) || t.name().replace("_", "").equalsIgnoreCase(value.replace("_", ""))) {
                return t;
            }
        }
        return null;
    }
}