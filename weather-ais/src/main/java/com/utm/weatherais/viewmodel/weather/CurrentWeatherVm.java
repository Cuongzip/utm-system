package com.utm.weatherais.viewmodel.weather;

import java.time.ZonedDateTime;

public record CurrentWeatherVm(
        String hubId,
        String hubName,
        Double latitude,
        Double longitude,
        Double temperatureC,
        Double apparentTemperatureC,
        Integer humidityPct,
        Double windSpeedMs,
        Double windGustMs,
        Integer windDirectionDeg,
        Double visibilityM,
        Integer cloudCoverPct,
        Double pressureHpa,
        Double precipitationMm,
        Integer weatherCode,
        String conditionSummary,
        String flightCategory,
        String flightConditions,
        ZonedDateTime observedAt
) {
}
