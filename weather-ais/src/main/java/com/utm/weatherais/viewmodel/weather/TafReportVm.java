package com.utm.weatherais.viewmodel.weather;

import java.time.ZonedDateTime;

public record TafReportVm(
        String icaoId,
        String stationName,
        Double latitude,
        Double longitude,
        String rawTaf,
        ZonedDateTime issueTime,
        ZonedDateTime validTimeFrom,
        ZonedDateTime validTimeTo
) {
}
