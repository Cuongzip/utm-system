package com.utm.flight.viewmodel;

import com.fasterxml.jackson.annotation.JsonAlias;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(
        description = "Request payload for updating an existing Waypoint in a Flight trajectory",
        example = """
        {
          "sequence": 2,
          "name": "Adjusted Checkpoint",
          "latitude": 10.7820,
          "longitude": 106.7050,
          "altitude": 80.0,
          "speedToWaypoint": 12.0,
          "hoverDuration": 0
        }
        """
)
public record WaypointPutVm(
        @Schema(description = "Updated sequence order (optional)", example = "2")
        Integer sequence,

        @Schema(description = "Updated milestone label (optional)", example = "Adjusted Checkpoint")
        String name,

        @Schema(description = "Updated latitude in degrees", example = "10.7820")
        @JsonAlias({"lat", "latitude"})
        Double latitude,

        @Schema(description = "Updated longitude in degrees", example = "106.7050")
        @JsonAlias({"lon", "longitude"})
        Double longitude,

        @Schema(description = "Updated altitude in meters", example = "80.0")
        @JsonAlias({"alt", "altitude"})
        Double altitude,

        @Schema(description = "Updated cruising speed in m/s", example = "12.0")
        @JsonAlias({"speed", "speedToWaypoint"})
        Double speedToWaypoint,

        @Schema(description = "Updated hover duration in seconds", example = "0")
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
