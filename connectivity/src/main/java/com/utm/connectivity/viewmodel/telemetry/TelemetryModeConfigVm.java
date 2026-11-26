package com.utm.connectivity.viewmodel.telemetry;

import com.utm.connectivity.model.enumeration.TelemetryMode;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Adaptive telemetry mode configuration")
public record TelemetryModeConfigVm(
        TelemetryMode mode,
        double rateHz,
        int intervalMs,
        String description
) {
}
