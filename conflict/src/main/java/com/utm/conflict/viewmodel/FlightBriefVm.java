package com.utm.conflict.viewmodel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FlightBriefVm(
        String id,
        String flightNumber,
        String droneId,
        String departureHubId
) {
}
