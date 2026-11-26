package com.utm.mission.viewmodel.waypoint;

import com.utm.mission.model.enumeration.StopoverType;
import com.utm.mission.model.enumeration.WaypointType;
import com.utm.mission.viewmodel.client.HubBriefVm;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.Map;

@Schema(description = "Waypoint details")
public record WaypointVm(
        @Schema(description = "Waypoint UUID identifier") String id,
        @Schema(description = "Mission UUID identifier") String missionId,
        @Schema(description = "Sequence order of waypoint in mission") Integer sequence,
        @Schema(description = "Waypoint designation or name") String name,
        @Schema(description = "GPS latitude") Double latitude,
        @Schema(description = "GPS longitude") Double longitude,
        @Schema(description = "Altitude in meters AGL") Double altitude,
        @Schema(description = "Optional stopover hub UUID identifier") String hubId,
        @Schema(description = "Stopover type at hub") StopoverType stopoverType,
        @Schema(description = "Ground turnaround time in minutes at stopover hub") Integer groundTimeMinutes,
        @Schema(description = "Payload delta in kg at this waypoint") Double payloadDeltaKg,
        @Schema(description = "Hover duration in seconds at this waypoint") Integer hoverDurationSec,
        @Schema(description = "Actions at waypoint") Map<String, Object> actions,
        @Schema(description = "Conditions at waypoint") Map<String, Object> conditions,
        @Schema(description = "Safety warnings") String warning,
        @Schema(description = "Creation timestamp") ZonedDateTime createdOn,
        @Schema(description = "Created by user ID") String createdBy,
        @Schema(description = "Last modified timestamp") ZonedDateTime lastModifiedOn,
        @Schema(description = "Last modified by user ID") String lastModifiedBy,
        @Schema(description = "Target cruise speed towards this waypoint in m/s") Double speedToWaypoint,
        @Schema(description = "Desired heading in degrees (0-360) upon reaching waypoint") Double headingAtWaypoint,
        @Schema(description = "Fly-by turn radius in meters") Double turnRadius,
        @Schema(description = "Whether drone holds and awaits operator confirmation at this waypoint") Boolean waitForConfirmation,
        @Schema(description = "Waypoint node type: 'coordinate' or 'hub'") WaypointType waypointType,
        @Schema(description = "Enriched Hub details when waypointType is HUB") HubBriefVm hub
) {
    public WaypointVm(
            String id, String missionId, Integer sequence, String name,
            Double latitude, Double longitude, Double altitude,
            String hubId, StopoverType stopoverType, Integer groundTimeMinutes,
            Double payloadDeltaKg, Integer hoverDurationSec,
            Map<String, Object> actions, Map<String, Object> conditions, String warning,
            ZonedDateTime createdOn, String createdBy, ZonedDateTime lastModifiedOn, String lastModifiedBy,
            Double speedToWaypoint, Double headingAtWaypoint, Double turnRadius, Boolean waitForConfirmation) {
        this(id, missionId, sequence, name, latitude, longitude, altitude,
                hubId, stopoverType, groundTimeMinutes, payloadDeltaKg, hoverDurationSec,
                actions, conditions, warning, createdOn, createdBy, lastModifiedOn, lastModifiedBy,
                speedToWaypoint, headingAtWaypoint, turnRadius, waitForConfirmation,
                hubId != null ? WaypointType.HUB : WaypointType.COORDINATE, null);
    }

    public WaypointVm(
            String id, String missionId, Integer sequence, String name,
            Double latitude, Double longitude, Double altitude,
            String hubId, StopoverType stopoverType, Integer groundTimeMinutes,
            Double payloadDeltaKg, Integer hoverDurationSec,
            Map<String, Object> actions, Map<String, Object> conditions, String warning,
            ZonedDateTime createdOn, String createdBy, ZonedDateTime lastModifiedOn, String lastModifiedBy) {
        this(id, missionId, sequence, name, latitude, longitude, altitude,
                hubId, stopoverType, groundTimeMinutes, payloadDeltaKg, hoverDurationSec,
                actions, conditions, warning, createdOn, createdBy, lastModifiedOn, lastModifiedBy,
                null, null, null, false,
                hubId != null ? WaypointType.HUB : WaypointType.COORDINATE, null);
    }

    public WaypointVm(
            String id, String missionId, Integer sequence, String name,
            Double latitude, Double longitude, Double altitude,
            Map<String, Object> actions, Map<String, Object> conditions, String warning,
            ZonedDateTime createdOn, String createdBy, ZonedDateTime lastModifiedOn, String lastModifiedBy) {
        this(id, missionId, sequence, name, latitude, longitude, altitude,
                null, StopoverType.NONE, null, 0.0, 0,
                actions, conditions, warning, createdOn, createdBy, lastModifiedOn, lastModifiedBy,
                null, null, null, false, WaypointType.COORDINATE, null);
    }
}
