package com.utm.weatherais.viewmodel.dagr;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

public record DagrConfigVm(
        boolean enabled,
        String wmsUrl,
        String layer,
        String version,
        String attribution
) {
    public record DagrPointVm(
            @NotNull Double lat,
            @NotNull Double lon
    ) {
    }

    public record DagrCheckPointsPostVm(
            @NotEmpty @Valid List<DagrPointVm> points
    ) {
    }

    public record DagrAdvisoryVm(
            int pointIndex,
            Double lat,
            Double lon,
            String zoneName,
            String restriction,
            Map<String, Object> properties
    ) {
    }

    public record DagrCheckPointsResponseVm(
            boolean enabled,
            int checkedCount,
            int advisoryCount,
            List<DagrAdvisoryVm> advisories,
            ZonedDateTime checkedAt
    ) {
    }
}
