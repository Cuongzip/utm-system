package com.utm.flight.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record WeatherGoNoGoClientVm(
        String hubId,
        String hubName,
        String verdict,
        Double windSpeedMs,
        Double windGustMs,
        Integer windDirectionDeg,
        Double visibilityM,
        String flightCategory,
        String nearestStation,
        String windSource,
        List<String> reasons
) {
}
