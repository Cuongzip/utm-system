package com.utm.mission.viewmodel.waypoint;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Result of automatic energy-budget HUB waypoint planning for a mission")
public record AutoPlanHubsResultVm(
        @Schema(description = "Mission UUID")
        String missionId,

        @Schema(description = "Number of intermediate HUB stopover waypoints inserted")
        int insertedHubCount,

        @Schema(description = "Total number of waypoints after planning")
        int totalWaypoints,

        @Schema(description = "Resulting number of flight legs")
        int plannedLegCount,

        @Schema(description = "Recalculated total mission distance in meters")
        double estimatedDistanceMeters,

        @Schema(description = "Recalculated total mission duration in seconds")
        int estimatedDurationSeconds,

        @Schema(description = "Whether the planned HUB waypoints were persisted to the database")
        boolean persisted,

        @Schema(description = "Ordered mission waypoints including auto-inserted HUB stopover nodes")
        List<WaypointVm> waypoints,

        @Schema(description = "Planning explanations and inserted hub summaries")
        List<String> notes
) {
}
