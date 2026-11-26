package com.utm.flight.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum RiskAssessmentLevel {
    LOW("low"),
    MEDIUM("medium"),
    HIGH("high");

    private final String value;

    RiskAssessmentLevel(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static RiskAssessmentLevel fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        for (RiskAssessmentLevel level : values()) {
            if (level.value.equalsIgnoreCase(trimmed) || level.name().equalsIgnoreCase(trimmed)) {
                return level;
            }
        }
        throw new IllegalArgumentException("Unknown RiskAssessmentLevel: " + value);
    }
}
