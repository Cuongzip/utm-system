package com.utm.weatherais.viewmodel.weather;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

public record SigmetReportVm(
        String id,
        String firId,
        String firName,
        String hazard,
        String qualifier,
        String severity,
        Integer altitudeLowFt,
        Integer altitudeHighFt,
        String rawSigmet,
        ZonedDateTime validTimeFrom,
        ZonedDateTime validTimeTo,
        List<Map<String, Double>> coordinates
) {
}
