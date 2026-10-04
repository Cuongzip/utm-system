package com.utm.flight.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(
        description = "3D coordinate waypoint for flight trajectory",
        example = """
        {
          "lat": 10.7769,
          "lon": 106.7009,
          "alt": 50.0,
          "speed": 15.0
        }
        """
)
public record WaypointVm(
        @Schema(description = "Latitude in degrees (-90.0 to 90.0)", example = "10.7769")
        @NotNull(message = "Latitude is required")
        Double lat,

        @Schema(description = "Longitude in degrees (-180.0 to 180.0)", example = "106.7009")
        @NotNull(message = "Longitude is required")
        Double lon,

        @Schema(description = "Altitude in meters above ground/sea level", example = "50.0")
        @NotNull(message = "Altitude is required")
        Double alt,

        @Schema(description = "Target cruising speed at this waypoint in m/s (optional)", example = "15.0")
        Double speed
) {
    public WaypointVm(Double lat, Double lon, Double alt) {
        this(lat, lon, alt, null);
    }
}
