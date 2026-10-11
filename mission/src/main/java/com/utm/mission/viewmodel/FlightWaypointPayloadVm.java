package com.utm.mission.viewmodel;

public record FlightWaypointPayloadVm(
        Double lat,
        Double lon,
        Double alt,
        Double speed
) {
}
