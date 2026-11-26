package com.utm.connectivity.viewmodel.telemetry;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

@Schema(description = "Aggregated adaptive telemetry mode statistics across registered devices")
public record TelemetryRateStatsVm(
        long totalDevices,
        Map<String, Long> byMode
) {
}
