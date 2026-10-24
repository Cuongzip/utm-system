package com.utm.mission.viewmodel;

import com.utm.mission.model.enumeration.MissionScheduleType;
import com.utm.mission.model.enumeration.MissionStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.List;

@Schema(description = "Mission detailed information")
public record MissionVm(
        @Schema(description = "Mission UUID identifier", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String id,

        @Schema(description = "Mission name", example = "Nhiệm vụ giao hàng chặng Hub 1 - Hub 2")
        String name,

        @Schema(description = "Mission detailed description", example = "Giao bưu kiện nhẹ 1.2kg")
        String description,

        @Schema(description = "Departure Hub UUID identifier", example = "550e8400-e29b-41d4-a716-446655440000")
        String departureHubId,

        @Schema(description = "Arrival Hub UUID identifier", example = "660e8400-e29b-41d4-a716-446655440001")
        String arrivalHubId,

        @Schema(description = "Schedule type ('immediate' or 'scheduled')", example = "immediate")
        MissionScheduleType scheduleType,

        @Schema(description = "Scheduled departure timestamp", example = "2026-10-15T08:00:00Z")
        ZonedDateTime scheduledAt,

        @Schema(description = "Mission operational status", example = "draft")
        MissionStatus status,

        @Schema(description = "Total number of waypoints defined for this mission", example = "5")
        Integer waypointCount,

        @Schema(description = "Estimated route distance in meters calculated using Haversine formula", example = "12540.5")
        Double estimatedDistanceMeters,

        @Schema(description = "Ordered list of waypoints along the mission route")
        List<WaypointVm> waypoints,

        @Schema(description = "Departure hub brief details")
        HubBriefVm departureHub,

        @Schema(description = "Arrival hub brief details")
        HubBriefVm arrivalHub,

        @Schema(description = "Creation timestamp")
        ZonedDateTime createdOn,

        @Schema(description = "Created by user ID (Keycloak sub)")
        String createdBy,

        @Schema(description = "Last modified timestamp")
        ZonedDateTime lastModifiedOn,

        @Schema(description = "Last modified by user ID")
        String lastModifiedBy
) {
}
