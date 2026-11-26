package com.utm.mission.viewmodel.client;

import java.util.Map;

public record FlightWaypointPayloadVm(
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
    public FlightWaypointPayloadVm(
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

    public FlightWaypointPayloadVm(Double latitude, Double longitude, Double altitude, Double speed) {
        this(null, null, latitude, longitude, altitude, null, speed != null ? Map.of("speed", speed) : null,
                "coordinate", null, "none", speed, null, null, 0, false, 0.0);
    }
}
