package com.utm.organization.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum OrganizationType {
    OPERATOR("operator"),
    AUTHORITY("authority"),
    ENTERPRISE("enterprise");

    private final String value;

    OrganizationType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static OrganizationType fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (OrganizationType type : values()) {
            if (type.value.equalsIgnoreCase(value) || type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown OrganizationType: " + value);
    }
}
