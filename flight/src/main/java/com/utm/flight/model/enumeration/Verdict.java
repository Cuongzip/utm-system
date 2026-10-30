package com.utm.flight.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum Verdict {
    GO("go"),
    MARGINAL("marginal"),
    NO_GO("no_go"),
    UNKNOWN("unknown");

    private final String value;

    Verdict(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static Verdict fromValue(String value) {
        if (value == null) {
            return UNKNOWN;
        }
        for (Verdict verdict : Verdict.values()) {
            if (verdict.value.equalsIgnoreCase(value) || verdict.name().equalsIgnoreCase(value)) {
                return verdict;
            }
        }
        return UNKNOWN;
    }
}
