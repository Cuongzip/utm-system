package com.utm.conflict.viewmodel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FlightClientVm(
        String id,
        String flightNumber,
        String droneId,
        String departureHubId,
        String arrivalHubId,
        String pilotId,
        String status,
        Double cruisingAltitudeM
) {
}
