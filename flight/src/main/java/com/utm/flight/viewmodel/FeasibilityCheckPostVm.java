package com.utm.flight.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Parameters for evaluating flight feasibility and energy profile")
public record FeasibilityCheckPostVm(
        @Schema(description = "Mission payload weight in kilograms (kg)", example = "2.0")
        Double payloadKg,

        @Schema(description = "Weather condition override (optional)")
        WeatherOverrideVm weatherOverride,

        @Schema(description = "Mission distance in meters (optional override, default calculated from route)", example = "4500.0")
        Double distanceM,

        @Schema(description = "Mission hover time in seconds (optional override)", example = "60.0")
        Double hoverTimeS
) {
}
