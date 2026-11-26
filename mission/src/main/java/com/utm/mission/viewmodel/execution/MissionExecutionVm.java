package com.utm.mission.viewmodel.execution;

import com.utm.mission.model.enumeration.ExecutionMode;
import com.utm.mission.model.enumeration.ExecutionStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

@Schema(description = "Mission execution progress profile")
public record MissionExecutionVm(
        @Schema(description = "Execution unique UUID identifier", example = "550e8400-e29b-41d4-a716-446655440000")
        String id,

        @Schema(description = "Associated mission UUID identifier", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        String missionId,

        @Schema(description = "Assigned Remote Pilot ID or Keycloak user ID")
        String pilotId,

        @Schema(description = "Timestamp when execution started", example = "2026-10-11T09:00:00Z")
        ZonedDateTime startedAt,

        @Schema(description = "Timestamp when execution finished", example = "2026-10-11T09:45:00Z")
        ZonedDateTime completedAt,

        @Schema(description = "Execution progress status (in_progress, paused, completed, aborted, failed)", example = "in_progress")
        ExecutionStatus status,

        @Schema(description = "Creation timestamp", example = "2026-10-11T09:00:00Z")
        ZonedDateTime createdOn,

        @Schema(description = "Username who started execution", example = "admin")
        String createdBy,

        @Schema(description = "Execution coordination mode (same_drone_sequential, multi_drone_relay)")
        ExecutionMode executionMode,

        @Schema(description = "Primary drone UUID assigned to this execution")
        String primaryDroneId,

        @Schema(description = "Zero-based index of currently active leg", example = "0")
        Integer currentLegIndex,

        @Schema(description = "Total number of flight legs in this execution", example = "2")
        Integer totalLegs,

        @Schema(description = "Number of completed flight legs", example = "0")
        Integer completedLegs,

        @Schema(description = "Timestamp when execution was paused")
        ZonedDateTime pausedAt,

        @Schema(description = "Reason for aborting execution")
        String abortReason,

        @Schema(description = "Diagnostic error message if execution failed or paused due to leg incident")
        String errorMessage,

        @Schema(description = "Trigger source (MANUAL or SCHEDULED)")
        String triggerType,

        @Schema(description = "Ordered list of flight legs belonging to this execution")
        List<MissionExecutionLegVm> legs,

        @Schema(description = "Latest reached waypoint index (1-based sequence within current leg)")
        Integer currentWaypointIndex,

        @Schema(description = "Total count of completed waypoint arrivals across execution")
        Integer completedWaypoints,

        @Schema(description = "Chronological log of reached waypoints")
        List<Map<String, Object>> waypointLogs
) {
    public MissionExecutionVm(
            String id,
            String missionId,
            String pilotId,
            ZonedDateTime startedAt,
            ZonedDateTime completedAt,
            ExecutionStatus status,
            ZonedDateTime createdOn,
            String createdBy,
            ExecutionMode executionMode,
            String primaryDroneId,
            Integer currentLegIndex,
            Integer totalLegs,
            Integer completedLegs,
            ZonedDateTime pausedAt,
            String abortReason,
            String errorMessage,
            String triggerType,
            List<MissionExecutionLegVm> legs
    ) {
        this(id, missionId, pilotId, startedAt, completedAt, status, createdOn, createdBy,
                executionMode, primaryDroneId, currentLegIndex, totalLegs, completedLegs,
                pausedAt, abortReason, errorMessage, triggerType, legs, 0, 0, List.of());
    }

    public MissionExecutionVm(
            String id,
            String missionId,
            String pilotId,
            ZonedDateTime startedAt,
            ZonedDateTime completedAt,
            ExecutionStatus status,
            ZonedDateTime createdOn,
            String createdBy
    ) {
        this(id, missionId, pilotId, startedAt, completedAt, status, createdOn, createdBy,
                ExecutionMode.SAME_DRONE_SEQUENTIAL, null, 0, 1, 0,
                null, null, null, "MANUAL", List.of(), 0, 0, List.of());
    }
}
