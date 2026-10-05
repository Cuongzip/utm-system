package com.utm.conflict.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ResolutionStrategy {
    ALTITUDE_CHANGE("altitude_change"),
    SPEED_ADJUSTMENT("speed_adjustment"),
    REROUTE("reroute"),
    HOLD("hold"),
    AUTO_CLEARED("auto_cleared");

    private final String value;

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static ResolutionStrategy fromValue(String value) {
        if (value == null) return null;
        for (ResolutionStrategy strategy : values()) {
            if (strategy.value.equalsIgnoreCase(value) || strategy.name().equalsIgnoreCase(value)) {
                return strategy;
            }
        }
        return null;
    }
}
