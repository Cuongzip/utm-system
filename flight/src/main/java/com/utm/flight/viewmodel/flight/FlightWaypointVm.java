package com.utm.flight.viewmodel.flight;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "Waypoint details within a flight plan")
public record FlightWaypointVm(
        @Schema(description = "Sequence number of waypoint in flight (1, 2, ...)", example = "1") Integer sequence,
        @Schema(description = "Waypoint designation or name", example = "Departure: Hoa Khanh Pad 1") String name,
        @Schema(description = "GPS latitude", example = "16.0544") Double latitude,
        @Schema(description = "GPS longitude", example = "108.2208") Double longitude,
        @Schema(description = "Target flight altitude in meters AGL", example = "50.0") Double altitude,
        @Schema(description = "Actions at waypoint (takeoff, hover, winch_drop, land)", example = "{\"type\":\"takeoff\"}") Map<String, Object> actions,
        @Schema(description = "Flight conditions at waypoint (speed limit, wind tolerance)", example = "{\"speed\":15.0}") Map<String, Object> conditions,
        @Schema(description = "Waypoint node type: coordinate or hub", example = "coordinate") String waypointType,
        @Schema(description = "Optional stopover hub UUID when waypointType is hub") String hubId,
        @Schema(description = "Stopover action type at hub (none, recharge, battery_swap, relay_handoff, payload_dropoff, payload_pickup)") String stopoverType,
        @Schema(description = "Target cruise speed towards this waypoint in m/s") Double speedToWaypoint,
        @Schema(description = "Desired heading in degrees (0-360) upon reaching waypoint") Double headingAtWaypoint,
        @Schema(description = "Fly-by turn radius in meters") Double turnRadius,
        @Schema(description = "Hover duration in seconds at this waypoint") Integer hoverDurationSec,
        @Schema(description = "Whether drone holds and awaits operator confirmation upon reaching waypoint") Boolean waitForConfirmation,
        @Schema(description = "Payload weight delta in kg applied at this waypoint") Double payloadDeltaKg
) {
    public FlightWaypointVm(
            Integer sequence,
            String name,
            Double latitude,
            Double longitude,
            Double altitude,
            Map<String, Object> actions,
            Map<String, Object> conditions
    ) {
        this(sequence, name, latitude, longitude, altitude, actions, conditions,
                "coordinate", null, "none", null, null, null, 0, false, 0.0);
    }
}
