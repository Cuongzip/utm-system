package com.utm.flight.viewmodel.feasibility;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Environmental weather conditions override")
public record WeatherOverrideVm(
        @Schema(description = "Wind speed in meters per second (m/s)", example = "4.5")
        Double windSpeedMs
) {
}

