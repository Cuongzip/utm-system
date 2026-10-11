package com.utm.mission.viewmodel;

import java.time.ZonedDateTime;
import java.util.List;

public record FlightCreateRequestVm(
        String flightNumber,
        String droneId,
        String departureHubId,
        String arrivalHubId,
        String pilotId,
        ZonedDateTime scheduledDeparture,
        ZonedDateTime scheduledArrival,
        Double cruisingAltitudeM,
        String notes,
        String executionId,
        List<FlightWaypointPayloadVm> waypoints
) {
}
