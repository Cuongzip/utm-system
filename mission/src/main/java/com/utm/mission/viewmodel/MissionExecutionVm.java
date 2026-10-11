package com.utm.mission.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Mission execution progress profile")
public record MissionExecutionVm(
        @Schema(description = "Execution unique UUID identifier", example = "550e8400-e29b-41d4-a716-446655440000")
        String id,

        @Schema(description = "Associated mission UUID identifier", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        String missionId,

        @Schema(description = "Index of waypoint drone is currently targeting", example = "0")
        Integer currentWaypointIndex,

        @Schema(description = "Total number of waypoints in mission", example = "5")
        Integer totalWaypoints,

        @Schema(description = "Number of waypoints completed by drone", example = "0")
        Integer completedWaypoints,

        @Schema(description = "Timestamp when execution started", example = "2026-10-11T09:00:00Z")
        ZonedDateTime startedAt,

        @Schema(description = "Timestamp when execution finished", example = "2026-10-11T09:45:00Z")
        ZonedDateTime completedAt,

        @Schema(description = "Execution progress status (in_progress, paused, completed, aborted, failed)", example = "in_progress")
        String status,

        @Schema(description = "Creation timestamp", example = "2026-10-11T09:00:00Z")
        ZonedDateTime createdOn,

        @Schema(description = "Username who started execution", example = "admin")
        String createdBy
) {
}
