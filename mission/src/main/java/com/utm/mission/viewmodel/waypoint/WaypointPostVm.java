package com.utm.mission.viewmodel.waypoint;

import com.utm.mission.model.enumeration.StopoverType;
import com.utm.mission.model.enumeration.WaypointType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.Map;

@Schema(description = "Request payload for creating a new waypoint (COORDINATE or HUB)")
public record WaypointPostVm(
        @Schema(description = "Waypoint designation or semantic name")
        @Size(max = 100, message = "Waypoint name must not exceed 100 characters")
        String name,

        @Schema(description = "GPS latitude (-90 to 90; locked from Hub when waypointType is HUB)")
        @Min(value = -90, message = "Latitude must be between -90 and 90")
        @Max(value = 90, message = "Latitude must be between -90 and 90")
        Double latitude,

        @Schema(description = "GPS longitude (-180 to 180; locked from Hub when waypointType is HUB)")
        @Min(value = -180, message = "Longitude must be between -180 and 180")
        @Max(value = 180, message = "Longitude must be between -180 and 180")
        Double longitude,

        @Schema(description = "Target altitude in meters AGL (> 0 for COORDINATE; >= 0 / defaults to 0m pad for HUB)")
        @DecimalMin(value = "0.0", inclusive = true, message = "Altitude must be >= 0")
        Double altitude,

        @Schema(description = "Actions to execute at waypoint")
        Map<String, Object> actions,

        @Schema(description = "Flight conditions at waypoint")
        Map<String, Object> conditions,

        @Schema(description = "Intermediate Hub UUID for HUB stopover node")
        String hubId,

        @Schema(description = "Stopover action type at hub (required non-NONE for HUB waypoints)")
        StopoverType stopoverType,

        @Schema(description = "Ground turnaround time in minutes at stopover hub")
        @PositiveOrZero(message = "Ground time minutes must be >= 0")
        Integer groundTimeMinutes,

        @Schema(description = "Payload weight delta in kg applied after this waypoint")
        Double payloadDeltaKg,

        @Schema(description = "Hover duration in seconds at this waypoint")
        @PositiveOrZero(message = "Hover duration must be >= 0")
        Integer hoverDurationSec,

        @Schema(description = "Target cruise speed towards this waypoint in m/s")
        @PositiveOrZero(message = "Speed to waypoint must be >= 0")
        Double speedToWaypoint,

        @Schema(description = "Desired heading in degrees (0-360) upon reaching waypoint")
        @Min(value = 0, message = "Heading must be >= 0")
        @Max(value = 360, message = "Heading must be <= 360")
        Double headingAtWaypoint,

        @Schema(description = "Fly-by turn radius in meters")
        @PositiveOrZero(message = "Turn radius must be >= 0")
        Double turnRadius,

        @Schema(description = "Whether drone should hold and await operator confirmation at this waypoint")
        Boolean waitForConfirmation,

        @Schema(description = "Waypoint node type: 'coordinate' (airborne) or 'hub' (vertiport stopover boundary)")
        WaypointType waypointType
) {
    public WaypointPostVm(
            String name, Double latitude, Double longitude, Double altitude,
            Map<String, Object> actions, Map<String, Object> conditions,
            String hubId, StopoverType stopoverType, Integer groundTimeMinutes,
            Double payloadDeltaKg, Integer hoverDurationSec,
            Double speedToWaypoint, Double headingAtWaypoint, Double turnRadius,
            Boolean waitForConfirmation) {
        this(name, latitude, longitude, altitude, actions, conditions, hubId, stopoverType,
                groundTimeMinutes, payloadDeltaKg, hoverDurationSec, speedToWaypoint,
                headingAtWaypoint, turnRadius, waitForConfirmation, null);
    }

    public WaypointPostVm(
            String name, Double latitude, Double longitude, Double altitude,
            Map<String, Object> actions, Map<String, Object> conditions,
            String hubId, StopoverType stopoverType, Integer groundTimeMinutes,
            Double payloadDeltaKg, Integer hoverDurationSec) {
        this(name, latitude, longitude, altitude, actions, conditions, hubId, stopoverType,
                groundTimeMinutes, payloadDeltaKg, hoverDurationSec, null, null, null, false, null);
    }

    public WaypointPostVm(
            String name, Double latitude, Double longitude, Double altitude,
            Map<String, Object> actions, Map<String, Object> conditions) {
        this(name, latitude, longitude, altitude, actions, conditions,
                null, StopoverType.NONE, null, 0.0, 0, null, null, null, false, WaypointType.COORDINATE);
    }
}
