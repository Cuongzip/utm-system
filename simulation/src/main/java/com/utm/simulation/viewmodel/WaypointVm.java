package com.utm.simulation.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "3D coordinate waypoint for flight trajectory simulation")
public record WaypointVm(
        @Schema(description = "Latitude in degrees", example = "10.7769")
        @NotNull(message = "Latitude is required")
        Double lat,

        @Schema(description = "Longitude in degrees", example = "106.7009")
        @NotNull(message = "Longitude is required")
        Double lon,

        @Schema(description = "Altitude in meters above ground/sea level", example = "50.0")
        @NotNull(message = "Altitude is required")
        Double alt
) {
}
