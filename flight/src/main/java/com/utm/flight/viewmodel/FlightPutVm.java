package com.utm.flight.viewmodel;

import java.time.ZonedDateTime;

public record FlightPutVm(
        String droneId,
        String departureHubId,
        String arrivalHubId,
        String pilotId,
        ZonedDateTime scheduledDeparture,
        ZonedDateTime scheduledArrival,
        Double cruisingAltitudeM,
        String notes
) {
}
