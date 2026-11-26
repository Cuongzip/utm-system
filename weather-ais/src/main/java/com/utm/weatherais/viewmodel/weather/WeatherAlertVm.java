package com.utm.weatherais.viewmodel.weather;

import java.time.ZonedDateTime;

public record WeatherAlertVm(
        String type,
        String severity,
        String title,
        String message,
        Double measuredValue,
        Double thresholdValue,
        String unit,
        ZonedDateTime issuedAt
) {
}
