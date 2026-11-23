package com.utm.mission.viewmodel.client;

import java.util.Map;

public record FlightWaypointPayloadVm(
        Integer sequence,
        String name,
        Double latitude,
        Double longitude,
        Double altitude,
        Map<String, Object> actions,
        Map<String, Object> conditions) {
    public FlightWaypointPayloadVm(Double latitude, Double longitude, Double altitude, Double speed) {
        this(null, null, latitude, longitude, altitude, null, speed != null ? Map.of("speed", speed) : null);
    }
}
