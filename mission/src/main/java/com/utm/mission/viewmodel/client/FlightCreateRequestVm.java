package com.utm.mission.viewmodel.client;

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
        List<FlightWaypointPayloadVm> waypoints,
        String missionId,
        Integer legIndex,
        Integer totalLegs,
        String dependsOnFlightId,
        Double payloadWeightKg,
        Double expectedInitialBatteryPct,
        Integer minimumTurnaroundMinutes,
        String arrivalStopoverType
) {
    public FlightCreateRequestVm(
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
            List<FlightWaypointPayloadVm> waypoints,
            String missionId,
            Integer legIndex,
            Integer totalLegs,
            String dependsOnFlightId,
            Double payloadWeightKg
    ) {
        this(flightNumber, droneId, departureHubId, arrivalHubId, pilotId, scheduledDeparture,
                scheduledArrival, cruisingAltitudeM, notes, executionId, waypoints,
                missionId, legIndex, totalLegs, dependsOnFlightId, payloadWeightKg, null, 0, null);
    }

    public FlightCreateRequestVm(
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
        this(flightNumber, droneId, departureHubId, arrivalHubId, pilotId, scheduledDeparture,
                scheduledArrival, cruisingAltitudeM, notes, executionId, waypoints,
                null, null, null, null, 0.0, null, 0, null);
    }
}
