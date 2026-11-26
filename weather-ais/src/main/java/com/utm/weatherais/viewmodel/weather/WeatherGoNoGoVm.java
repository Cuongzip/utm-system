package com.utm.weatherais.viewmodel.weather;

import java.time.ZonedDateTime;
import java.util.List;

public record WeatherGoNoGoVm(
        String hubId,
        String hubName,
        String verdict,
        Double windSpeedMs,
        Double windGustMs,
        Integer windDirectionDeg,
        Double visibilityM,
        String flightCategory,
        String nearestStation,
        Double stationDistanceKm,
        String windSource,
        int activeSigmetsCount,
        List<String> reasons,
        MetarReportVm metar,
        CurrentWeatherVm currentWeather,
        ZonedDateTime evaluatedAt
) {
}
