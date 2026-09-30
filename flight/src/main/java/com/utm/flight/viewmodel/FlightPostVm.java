package com.utm.flight.viewmodel;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.ZonedDateTime;

public record FlightPostVm(
        @NotBlank(message = "Flight number cannot be blank")
        String flightNumber,

        @NotBlank(message = "Drone ID cannot be blank")
        String droneId,

        @NotBlank(message = "Departure Hub ID cannot be blank")
        String departureHubId,

        @NotBlank(message = "Arrival Hub ID cannot be blank")
        String arrivalHubId,

        String pilotId,

        @NotNull(message = "Scheduled departure time is required")
        ZonedDateTime scheduledDeparture,

        @NotNull(message = "Scheduled arrival time is required")
        ZonedDateTime scheduledArrival,

        Double cruisingAltitudeM,

        String notes
) {
}
