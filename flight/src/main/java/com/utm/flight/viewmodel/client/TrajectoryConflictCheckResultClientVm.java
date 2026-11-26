package com.utm.flight.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TrajectoryConflictCheckResultClientVm(
        boolean clear,
        int evaluatedFlightsCount,
        List<Map<String, Object>> conflicts,
        String recommendation
) {
}
