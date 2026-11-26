package com.utm.flight.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AirspacePathCheckResultVm(
        boolean safe,
        List<AirspacePathViolationVm> violations
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AirspacePathViolationVm(
            String zoneId,
            @JsonAlias("name") String zoneName,
            String zoneType,
            String reason
    ) {
    }
}
