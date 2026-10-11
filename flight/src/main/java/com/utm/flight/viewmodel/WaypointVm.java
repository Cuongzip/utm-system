package com.utm.flight.viewmodel;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(
        description = "3D coordinate waypoint for flight trajectory",
        example = """
        {
          "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          "flightId": "550e8400-e29b-41d4-a716-446655440000",
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
public record WaypointVm(
        @Schema(description = "Unique UUID identifier of the waypoint", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        String id,

        @Schema(description = "Parent Flight UUID identifier", example = "550e8400-e29b-41d4-a716-446655440000")
        String flightId,

        @Schema(description = "Sequence order of this waypoint along the trajectory (1, 2, 3...)", example = "1")
        Integer sequence,

        @Schema(description = "Optional label or milestone name", example = "Takeoff Point Alpha")
        @Size(max = 100, message = "Waypoint name must not exceed 100 characters")
        String name,

        @Schema(description = "Latitude in degrees (-90.0 to 90.0)", example = "10.7769")
        @NotNull(message = "Latitude is required")
        @Min(value = -90, message = "Latitude must be between -90 and 90")
        @Max(value = 90, message = "Latitude must be between -90 and 90")
        @JsonProperty("latitude")
        @JsonAlias({"lat", "latitude"})
        Double latitude,

        @Schema(description = "Longitude in degrees (-180.0 to 180.0)", example = "106.7009")
        @NotNull(message = "Longitude is required")
        @Min(value = -180, message = "Longitude must be between -180 and 180")
        @Max(value = 180, message = "Longitude must be between -180 and 180")
        @JsonProperty("longitude")
        @JsonAlias({"lon", "longitude", "lng"})
        Double longitude,

        @Schema(description = "Altitude in meters above ground/sea level", example = "50.0")
        @NotNull(message = "Altitude is required")
        @DecimalMin(value = "0.0", message = "Altitude must be greater than or equal to 0")
        @JsonProperty("altitude")
        @JsonAlias({"alt", "altitude"})
        Double altitude,

        @Schema(description = "Target cruising speed at this waypoint in m/s (optional)", example = "15.0")
        @JsonProperty("speedToWaypoint")
        @JsonAlias({"speed", "speedToWaypoint"})
        Double speedToWaypoint,

        @Schema(description = "Hover duration at this waypoint in seconds (optional)", example = "0")
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

    public Double getLat() {
        return latitude;
    }

    public Double getLon() {
        return longitude;
    }

    public Double getAlt() {
        return altitude;
    }

    public Double getSpeed() {
        return speedToWaypoint;
    }

    public WaypointVm(Double lat, Double lon, Double alt, Double speed) {
        this(null, null, null, null, lat, lon, alt, speed, null);
    }

    public WaypointVm(Double lat, Double lon, Double alt) {
        this(lat, lon, alt, null);
    }
}
