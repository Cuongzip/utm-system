package com.utm.commonlibrary.kafka.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.ZonedDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EmergencyStateEvent(
        String eventType,
        String incidentId,
        String incidentNumber,
        String droneId,
        String flightId,
        String emergencyType,
        String severity,
        String status,
        String responseAction,
        String message,
        ZonedDateTime timestamp
) {
    public static final String INCIDENT_CREATED = "INCIDENT_CREATED";
    public static final String INCIDENT_RESOLVED = "INCIDENT_RESOLVED";
    public static final String MODE_CHANGED = "MODE_CHANGED";
}
