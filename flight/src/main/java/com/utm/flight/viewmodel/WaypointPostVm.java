package com.utm.flight.viewmodel;

import com.fasterxml.jackson.annotation.JsonAlias;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(
        description = "Request payload for adding a new Waypoint to a Flight trajectory",
        example = """
        {
          "sequence": 1,
          "name": "Takeoff Point Alpha",
          "latitude": 10.7769,
          "longitude": 106.7009,
          "altitude": 50.0,
          "speedToWaypoint": 15.0,
          "hoverDuration": 5
        }
        """
)
public record WaypointPostVm(
        @Schema(description = "Sequence order of this waypoint along the trajectory (1, 2, 3...)", example = "1")
        Integer sequence,

        @Schema(description = "Optional label or milestone name", example = "Takeoff Point Alpha")
        String name,

        @Schema(description = "Latitude in degrees (-90.0 to 90.0)", example = "10.7769")
        @NotNull(message = "Latitude is required")
        @JsonAlias({"lat", "latitude"})
        Double latitude,

        @Schema(description = "Longitude in degrees (-180.0 to 180.0)", example = "106.7009")
        @NotNull(message = "Longitude is required")
        @JsonAlias({"lon", "longitude"})
        Double longitude,

        @Schema(description = "Altitude in meters above ground/sea level", example = "50.0")
        @NotNull(message = "Altitude is required")
        @JsonAlias({"alt", "altitude"})
        Double altitude,

        @Schema(description = "Target cruising speed at this waypoint in m/s (optional)", example = "15.0")
        @JsonAlias({"speed", "speedToWaypoint"})
        Double speedToWaypoint,

        @Schema(description = "Hover duration at this waypoint in seconds (optional)", example = "5")
        Integer hoverDuration
) {
    public Double lat() {
        return latitude;
    }

    public Double lon() {
        return longitude;
    }

    public Double alt() {
        return altitude;
    }

    public Double speed() {
        return speedToWaypoint;
    }
}
