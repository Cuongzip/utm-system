package com.utm.hub.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FlightBriefClientVm(
        String id,
        String status,
        String departureHubId,
        String arrivalHubId
) {
}

