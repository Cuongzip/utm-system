package com.utm.simulation.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SimulationFlightPhase {
    PREFLIGHT("preflight"),
    TAKEOFF("takeoff"),
    CLIMB("climb"),
    CRUISE("cruise"),
    HOVER("hover"),
    DESCENT("descent"),
    LANDING("landing"),
    LANDED("landed"),
    EMERGENCY("emergency");

    private final String value;

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static SimulationFlightPhase fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        for (SimulationFlightPhase p : values()) {
            if (p.value.equalsIgnoreCase(value) || p.name().equalsIgnoreCase(value)) {
                return p;
            }
        }
        return CRUISE;
    }
}
