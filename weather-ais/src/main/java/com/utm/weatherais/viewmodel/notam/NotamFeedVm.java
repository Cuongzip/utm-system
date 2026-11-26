package com.utm.weatherais.viewmodel.notam;

import java.time.ZonedDateTime;
import java.util.List;

public record NotamFeedVm(
        int count,
        boolean enabled,
        List<String> icaos,
        ZonedDateTime updatedAt,
        String source,
        List<NotamItemVm> notams
) {
    public record NotamItemVm(
            String id,
            String seriesNumber,
            String icao,
            String qCode,
            String subject,
            String severity,
            Double latitude,
            Double longitude,
            Double radiusNm,
            Double radiusM,
            Double lowerLimitM,
            Double upperLimitM,
            ZonedDateTime validFrom,
            ZonedDateTime validTo,
            String text
    ) {
    }
}
