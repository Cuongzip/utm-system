package com.utm.drone.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum CommandType {
    TAKEOFF("takeoff"),
    LAND("land"),
    RTL("rtl"),
    EMERGENCY_STOP("emergency_stop"),
    PAUSE("pause"),
    HOVER("hover"),
    RESUME("resume"),
    GOTO("goto"),
    SET_ALTITUDE("set_altitude"),
    UPDATE_MISSION("update_mission"),
    SET_HOME("set_home"),
    CONFIGURE("configure");

    private final String value;

    CommandType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static CommandType fromValue(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        String trimmed = value.trim();
        for (CommandType type : values()) {
            if (type.value.equalsIgnoreCase(trimmed) || type.name().equalsIgnoreCase(trimmed)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown CommandType: " + value);
    }
}
