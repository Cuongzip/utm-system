package com.utm.simulation.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.ZonedDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TelemetryLatestVm(
        String droneId,
        String flightId,
        Double latitude,
        Double longitude,
        Double altitude,
        Double speed,
        Double heading,
        @JsonAlias({"batteryPercentage", "batteryLevel", "battery"})
        Double batteryPercentage,
        ZonedDateTime timestamp
) {
}
