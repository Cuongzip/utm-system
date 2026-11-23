package com.utm.emergency.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FlightSummaryVm(
        String id,
        String flightNumber,
        String droneId,
        String departureHubId,
        String arrivalHubId,
        String status) {
}
