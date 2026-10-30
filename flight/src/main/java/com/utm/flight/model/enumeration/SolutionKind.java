package com.utm.flight.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum SolutionKind {
    REDUCE_PAYLOAD("reduce_payload"),
    CHARGING_STOP("charging_stop"),
    OTHER_DRONE("other_drone"),
    AWAIT_WIND("await_wind");

    private final String value;

    SolutionKind(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static SolutionKind fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (SolutionKind kind : SolutionKind.values()) {
            if (kind.value.equalsIgnoreCase(value) || kind.name().equalsIgnoreCase(value)) {
                return kind;
            }
        }
        throw new IllegalArgumentException("Unknown SolutionKind: " + value);
    }
}
