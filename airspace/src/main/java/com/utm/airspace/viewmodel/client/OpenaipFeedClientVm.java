package com.utm.airspace.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.utm.airspace.viewmodel.zone.GeoJsonPolygonVm;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record OpenaipFeedClientVm(
        int count,
        boolean enabled,
        List<OpenaipAirspaceItemVm> airspaces
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record OpenaipAirspaceItemVm(
            String id,
            String name,
            String type,
            String severity,
            Double lowerLimitM,
            Double upperLimitM,
            GeoJsonPolygonVm geometry
    ) {
    }
}
