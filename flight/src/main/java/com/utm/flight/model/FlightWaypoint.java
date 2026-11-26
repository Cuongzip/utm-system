package com.utm.flight.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FlightWaypoint(
        Integer sequence,
        String name,
        Double latitude,
        Double longitude,
        Double altitude,
        Map<String, Object> actions,
        Map<String, Object> conditions,
        String waypointType,
        String hubId,
        String stopoverType,
        Double speedToWaypoint,
        Double headingAtWaypoint,
        Double turnRadius,
        Integer hoverDurationSec,
        Boolean waitForConfirmation,
        Double payloadDeltaKg
) {
    public FlightWaypoint(
            Integer sequence,
            String name,
            Double latitude,
            Double longitude,
            Double altitude,
            Map<String, Object> actions,
            Map<String, Object> conditions
    ) {
        this(sequence, name, latitude, longitude, altitude, actions, conditions,
                "coordinate", null, "none", null, null, null, 0, false, 0.0);
    }
}
