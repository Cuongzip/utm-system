package com.utm.mission.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum StopoverType {
    NONE("none", 0),
    RECHARGE("recharge", 30),
    BATTERY_SWAP("battery_swap", 10),
    RELAY_HANDOFF("relay_handoff", 10),
    PAYLOAD_DROPOFF("payload_dropoff", 5),
    PAYLOAD_PICKUP("payload_pickup", 5);

    private final String value;
    private final int defaultGroundTimeMinutes;

    @JsonValue
    public String getValue() {
        return value;
    }

    public boolean resetsBattery() {
        return this == RECHARGE || this == BATTERY_SWAP || this == RELAY_HANDOFF;
    }

    @JsonCreator
    public static StopoverType fromValue(String value) {
        if (value == null || value.isBlank()) {
            return NONE;
        }
        for (StopoverType type : values()) {
            if (type.value.equalsIgnoreCase(value.trim()) || type.name().equalsIgnoreCase(value.trim())) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown StopoverType: " + value);
    }
}
