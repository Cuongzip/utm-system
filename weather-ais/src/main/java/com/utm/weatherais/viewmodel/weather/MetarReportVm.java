package com.utm.weatherais.viewmodel.weather;

import java.time.ZonedDateTime;
import java.util.List;

public record MetarReportVm(
        String icaoId,
        String stationName,
        Double latitude,
        Double longitude,
        String rawOb,
        String flightCategory,
        Double temperatureC,
        Double dewpointC,
        Integer windDirectionDeg,
        Double windSpeedKt,
        Double windSpeedMs,
        Double windGustKt,
        Double windGustMs,
        Double visibilityM,
        Double altimeterHpa,
        List<String> clouds,
        ZonedDateTime observationTime
) {
}
