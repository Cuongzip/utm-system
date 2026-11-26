package com.utm.weatherais.viewmodel.openaip;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

public record OpenaipFeedVm(
        int count,
        boolean enabled,
        String country,
        ZonedDateTime updatedAt,
        String source,
        String attribution,
        List<OpenaipAirspaceVm> airspaces
) {
    public record OpenaipAirspaceVm(
            String id,
            String name,
            String country,
            String type,
            String icaoClass,
            String severity,
            Double lowerLimitM,
            Double upperLimitM,
            Map<String, Object> geometry
    ) {
    }
}
