package com.utm.flight.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Wind conditions applied during energy evaluation")
public record WindUsedVm(
        @Schema(description = "Wind speed in meters per second (m/s)", example = "5.0")
        Double speedMs,

        @Schema(description = "Source of wind data (override, weather_service, default)", example = "override")
        String source
) {
}
