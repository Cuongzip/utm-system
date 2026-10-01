package com.utm.airspace.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Payload for 3D point airspace compliance check")
public record AirspaceCheckVm(
        @Schema(description = "Latitude coordinate (WGS84)", example = "37.983810")
        @NotNull(message = "Latitude is required")
        Double lat,

        @Schema(description = "Longitude coordinate (WGS84)", example = "23.727539")
        @NotNull(message = "Longitude is required")
        Double lon,

        @Schema(description = "Altitude in meters above ground/sea level (m)", example = "120.0", defaultValue = "0.0")
        Double alt
) {
    public Double alt() {
        return alt != null ? alt : 0.0;
    }
}
