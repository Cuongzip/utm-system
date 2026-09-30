package com.utm.flight.viewmodel;

import java.time.ZonedDateTime;

public record FlightVm(
        String id,
        String flightNumber,
        String droneId,
        String departureHubId,
        String arrivalHubId,
        String pilotId,
        ZonedDateTime scheduledDeparture,
        ZonedDateTime scheduledArrival,
        ZonedDateTime actualDeparture,
        ZonedDateTime actualArrival,
        Double cruisingAltitudeM,
        String status,
        String notes,
        ZonedDateTime createdOn,
        String createdBy,
        ZonedDateTime lastModifiedOn,
        String lastModifiedBy
) {
}
