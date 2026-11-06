package com.utm.mission.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AirspaceCheckResult(
        boolean safe,
        List<Map<String, Object>> violations
) {
}

