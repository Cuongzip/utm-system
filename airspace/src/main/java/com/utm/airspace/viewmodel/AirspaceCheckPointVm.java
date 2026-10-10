package com.utm.airspace.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "3D coordinate waypoint point for path checking")
public record AirspaceCheckPointVm(
        @Schema(description = "Latitude coordinate (WGS84)", example = "10.778")
        @NotNull(message = "Latitude is required")
        Double lat,

        @Schema(description = "Longitude coordinate (WGS84)", example = "106.702")
        @NotNull(message = "Longitude is required")
        Double lon,

        @Schema(description = "Altitude in meters (m)", example = "85.0", defaultValue = "0.0")
        Double alt
) {
    public Double alt() {
        return alt != null ? alt : 0.0;
    }
}
