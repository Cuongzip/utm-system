package com.utm.flight.viewmodel.flight;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Map;

@Schema(description = "Waypoint details within a flight plan")
public record FlightWaypointVm(
                @Schema(description = "Sequence number of waypoint in flight (1, 2, ...)", example = "1") Integer sequence,

                @Schema(description = "Waypoint designation or name", example = "Departure: Hoa Khanh Pad 1") String name,

                @Schema(description = "GPS latitude", example = "16.0544") Double latitude,

                @Schema(description = "GPS longitude", example = "108.2208") Double longitude,

                @Schema(description = "Target flight altitude in meters", example = "50.0") Double altitude,

                @Schema(description = "Actions at waypoint (takeoff, hover, winch_drop, land)", example = "{\"type\":\"takeoff\"}") Map<String, Object> actions,

                @Schema(description = "Flight conditions at waypoint (speed limit, wind tolerance)", example = "{\"speed\":15.0}") Map<String, Object> conditions) {
}
