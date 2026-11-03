package com.utm.mission.viewmodel.client;

public record FlightWaypointPayloadVm(
        Double lat,
        Double lon,
        Double alt,
        Double speed
) {
}

