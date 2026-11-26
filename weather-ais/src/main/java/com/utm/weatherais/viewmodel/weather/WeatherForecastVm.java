package com.utm.weatherais.viewmodel.weather;

import java.time.ZonedDateTime;
import java.util.List;

public record WeatherForecastVm(
        String hubId,
        String hubName,
        Double latitude,
        Double longitude,
        ZonedDateTime generatedAt,
        List<ForecastHourVm> hourly
) {
    public record ForecastHourVm(
            String time,
            Double temperatureC,
            Integer humidityPct,
            Double windSpeedMs,
            Double windGustMs,
            Integer windDirectionDeg,
            Double precipitationProbabilityPct,
            Double precipitationMm,
            Double visibilityM,
            Integer cloudCoverPct,
            Integer weatherCode,
            String conditionSummary,
            String flightConditions
    ) {
    }
}
