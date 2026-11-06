package com.utm.airspace.viewmodel.check;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Payload for 3D point airspace compliance check")
public record AirspaceCheckVm(
        @Schema(description = "Latitude coordinate (WGS84)", example = "10.778")
        @NotNull(message = "Latitude is required")
        @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
        @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
        Double lat,

        @Schema(description = "Longitude coordinate (WGS84)", example = "106.702")
        @NotNull(message = "Longitude is required")
        @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
        @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
        Double lon,

        @Schema(description = "Altitude in meters above ground/sea level (m)", example = "85.0", defaultValue = "0.0")
        Double alt
) {
    public Double alt() {
        return alt != null ? alt : 0.0;
    }
}
