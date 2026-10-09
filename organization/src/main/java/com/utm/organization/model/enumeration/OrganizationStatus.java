package com.utm.organization.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum OrganizationStatus {
    ACTIVE("active"),
    SUSPENDED("suspended"),
    INACTIVE("inactive");

    private final String value;

    OrganizationStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static OrganizationStatus fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (OrganizationStatus status : values()) {
            if (status.value.equalsIgnoreCase(value) || status.name().equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown OrganizationStatus: " + value);
    }
}
