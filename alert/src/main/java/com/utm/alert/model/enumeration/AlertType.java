package com.utm.alert.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AlertType {
    LATERAL_CORRIDOR_BREACH("LATERAL_CORRIDOR_BREACH"),
    VERTICAL_ALTITUDE_BREACH("VERTICAL_ALTITUDE_BREACH"),
    THREE_D_VOLUME_BREACH("3D_VOLUME_BREACH"),
    C2_LINK_LOST("C2_LINK_LOST"),
    C2_LINK_LOST_CONTINGENT("C2_LINK_LOST_CONTINGENT"),
    NO_TELEMETRY_STREAM("NO_TELEMETRY_STREAM"),
    RECOVERY_CONFORMANT("RECOVERY_CONFORMANT"),
    BATTERY_LOW("BATTERY_LOW"),
    BATTERY_CRITICAL("BATTERY_CRITICAL"),
    GEOFENCE_BREACH("GEOFENCE_BREACH"),
    GEOFENCE_VIOLATION("GEOFENCE_VIOLATION"),
    AIRSPACE_BREACH("AIRSPACE_BREACH"),
    WEATHER_HAZARD("WEATHER_HAZARD"),
    CONFLICT_PROXIMITY("CONFLICT_PROXIMITY"),
    COLLISION_WARNING("COLLISION_WARNING"),
    MOTOR_FAILURE("MOTOR_FAILURE"),
    GPS_FAILURE("GPS_FAILURE"),
    SIGNAL_LOSS("SIGNAL_LOSS"),
    EMERGENCY_INCIDENT("EMERGENCY_INCIDENT"),
    SYSTEM_FAULT("SYSTEM_FAULT"),
    MANUAL_ALERT("MANUAL_ALERT"),
    CONFLICT("CONFLICT"),
    EQUIPMENT("EQUIPMENT"),
    COMMUNICATION("COMMUNICATION"),
    AIRSPACE("AIRSPACE"),
    WEATHER("WEATHER"),
    FLEET("FLEET"),
    HUB("HUB"),
    SECURITY("SECURITY"),
    OTHER("OTHER");

    private final String value;

    AlertType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static AlertType fromValue(String value) {
        if (value == null || value.isBlank()) {
            return OTHER;
        }
        for (AlertType type : values()) {
            if (type.value.equalsIgnoreCase(value.trim()) || type.name().equalsIgnoreCase(value.trim())) {
                return type;
            }
        }
        return OTHER;
    }
}
