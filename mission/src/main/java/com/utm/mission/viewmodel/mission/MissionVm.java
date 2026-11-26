package com.utm.mission.viewmodel.mission;

import com.utm.mission.model.enumeration.MissionScheduleType;
import com.utm.mission.model.enumeration.MissionStatus;
import com.utm.mission.viewmodel.client.HubBriefVm;
import com.utm.mission.viewmodel.waypoint.WaypointVm;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

@Schema(description = "Mission detailed information")
public record MissionVm(
        @Schema(description = "Mission UUID identifier") String id,
        @Schema(description = "Mission business tracking code") String code,
        @Schema(description = "Mission name") String name,
        @Schema(description = "Mission detailed description") String description,
        @Schema(description = "Payload mass in kilograms to transport") Double payloadWeightKg,
        @Schema(description = "Departure Hub UUID identifier") String departureHubId,
        @Schema(description = "Arrival Hub UUID identifier") String arrivalHubId,
        @Schema(description = "Optional pre-assigned Drone UUID identifier") String droneId,
        @Schema(description = "Optional pre-assigned Remote Pilot ID") String pilotId,
        @Schema(description = "Schedule type") MissionScheduleType scheduleType,
        @Schema(description = "Scheduled departure timestamp") ZonedDateTime scheduledAt,
        @Schema(description = "Mission operational status") MissionStatus status,
        @Schema(description = "Total number of waypoints defined for this mission") Integer waypointCount,
        @Schema(description = "Estimated route distance in meters calculated using Haversine formula") Double estimatedDistanceMeters,
        @Schema(description = "Ordered list of waypoints along the mission route") List<WaypointVm> waypoints,
        @Schema(description = "Departure hub brief details") HubBriefVm departureHub,
        @Schema(description = "Arrival hub brief details") HubBriefVm arrivalHub,
        @Schema(description = "Creation timestamp") ZonedDateTime createdOn,
        @Schema(description = "Created by user ID (Keycloak sub)") String createdBy,
        @Schema(description = "Last modified timestamp") ZonedDateTime lastModifiedOn,
        @Schema(description = "Last modified by user ID") String lastModifiedBy,
        @Schema(description = "Optional cron expression for recurring missions") String recurringPattern,
        @Schema(description = "Optional event trigger conditions") List<Map<String, Object>> triggerConditions,
        @Schema(description = "Optional required drone capabilities") List<String> requiredCapabilities,
        @Schema(description = "Optional feasibility override metadata") Map<String, Object> feasibilityOverride,
        @Schema(description = "Source mission template UUID if instantiated from template") String templateId,
        @Schema(description = "Source mission template version") Integer templateVersion,
        @Schema(description = "Persisted estimated route distance in meters") Double estimatedDistance,
        @Schema(description = "Persisted estimated flight duration in seconds") Integer estimatedDuration
) {
    public MissionVm(String id, String code, String name, String description, Double payloadWeightKg,
            String departureHubId, String arrivalHubId, String droneId, String pilotId,
            MissionScheduleType scheduleType, ZonedDateTime scheduledAt, MissionStatus status,
            Integer waypointCount, Double estimatedDistanceMeters,
            List<WaypointVm> waypoints, HubBriefVm departureHub, HubBriefVm arrivalHub,
            ZonedDateTime createdOn, String createdBy, ZonedDateTime lastModifiedOn, String lastModifiedBy) {
        this(id, code, name, description, payloadWeightKg, departureHubId, arrivalHubId, droneId, pilotId,
                scheduleType, scheduledAt, status, waypointCount, estimatedDistanceMeters,
                waypoints, departureHub, arrivalHub, createdOn, createdBy, lastModifiedOn, lastModifiedBy,
                null, null, null, null, null, null, estimatedDistanceMeters, null);
    }

    public MissionVm(String id, String code, String name, String description,
            String departureHubId, String arrivalHubId,
            MissionScheduleType scheduleType, ZonedDateTime scheduledAt, MissionStatus status,
            Integer waypointCount, Double estimatedDistanceMeters,
            List<WaypointVm> waypoints, HubBriefVm departureHub, HubBriefVm arrivalHub,
            ZonedDateTime createdOn, String createdBy, ZonedDateTime lastModifiedOn, String lastModifiedBy) {
        this(id, code, name, description, 0.0,
                departureHubId, arrivalHubId, null, null, scheduleType, scheduledAt, status, waypointCount,
                estimatedDistanceMeters, waypoints, departureHub, arrivalHub, createdOn, createdBy,
                lastModifiedOn, lastModifiedBy, null, null, null, null, null, null, estimatedDistanceMeters, null);
    }
}
