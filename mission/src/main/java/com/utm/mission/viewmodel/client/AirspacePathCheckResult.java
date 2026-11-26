package com.utm.mission.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AirspacePathCheckResult(
        boolean safe,
        List<Violation> violations
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Violation(
            String zoneId,
            @JsonAlias("name") String zoneName,
            String zoneType,
            String reason
    ) {
    }
}
