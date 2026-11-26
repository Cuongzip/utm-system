package com.utm.simulation.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "3D coordinate waypoint for flight trajectory simulation")
public record WaypointVm(
        @Schema(description = "Latitude in degrees", example = "10.7769")
        @JsonAlias({ "latitude", "lat" })
        @NotNull(message = "Latitude is required")
        Double lat,

        @Schema(description = "Longitude in degrees", example = "106.7009")
        @JsonAlias({ "longitude", "lon", "lng" })
        @NotNull(message = "Longitude is required")
        Double lon,

        @Schema(description = "Altitude in meters AGL", example = "50.0")
        @JsonAlias({ "altitude", "alt" })
        @NotNull(message = "Altitude is required")
        Double alt,

        @Schema(description = "Target cruising speed towards this waypoint in m/s (optional)", example = "15.0")
        @JsonAlias({ "speedToWaypoint", "speed" })
        Double speed,

        @Schema(description = "Hover hold duration in seconds upon reaching this waypoint (optional)", example = "10")
        @JsonAlias({ "hoverDurationSec", "hoverDuration" })
        Integer hoverDurationSec,

        @Schema(description = "Desired heading in degrees (0-360) upon reaching this waypoint (optional)", example = "90.0")
        @JsonAlias({ "headingAtWaypoint", "heading" })
        Double headingAtWaypoint
) {
    public WaypointVm(Double lat, Double lon, Double alt, Double speed) {
        this(lat, lon, alt, speed, 0, null);
    }

    public WaypointVm(Double lat, Double lon, Double alt) {
        this(lat, lon, alt, null, 0, null);
    }
}
