package com.utm.conflict.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.ZonedDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FlightBriefVm(
        String id,
        String flightNumber,
        String droneId,
        String departureHubId,
        String arrivalHubId,
        String status,
        Double cruisingAltitudeM,
        ZonedDateTime scheduledDeparture,
        ZonedDateTime scheduledArrival,
        JsonNode plannedRoute
) {
    public FlightBriefVm(
            String id,
            String flightNumber,
            String droneId,
            String departureHubId,
            String status,
            Double cruisingAltitudeM,
            ZonedDateTime scheduledDeparture,
            ZonedDateTime scheduledArrival,
            JsonNode plannedRoute) {
        this(id, flightNumber, droneId, departureHubId, null, status, cruisingAltitudeM,
                scheduledDeparture, scheduledArrival, plannedRoute);
    }

    public FlightBriefVm(String id, String flightNumber, String droneId, String departureHubId) {
        this(id, flightNumber, droneId, departureHubId, null, null, null, null, null, null);
    }
}

