package com.utm.mission.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.Map;

@Schema(description = "Waypoint details")
public record WaypointVm(
        @Schema(description = "Waypoint UUID identifier", example = "550e8400-e29b-41d4-a716-446655440000")
        String id,

        @Schema(description = "Mission UUID identifier", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String missionId,

        @Schema(description = "Sequence order of waypoint in mission (1, 2, 3...)", example = "1")
        Integer sequence,

        @Schema(description = "Waypoint designation or name", example = "Điểm cất cánh Hub 1")
        String name,

        @Schema(description = "GPS latitude", example = "10.7769")
        Double latitude,

        @Schema(description = "GPS longitude", example = "106.7009")
        Double longitude,

        @Schema(description = "Altitude in meters", example = "50.0")
        Double altitude,

        @Schema(description = "Actions at waypoint", example = "{\"type\": \"hover\", \"durationS\": 10}")
        Map<String, Object> actions,

        @Schema(description = "Conditions at waypoint", example = "{\"maxSpeed\": 15}")
        Map<String, Object> conditions,

        @Schema(description = "Safety warnings (e.g. proximity to no fly zone)", example = "Warning: Point near restricted airspace zone")
        String warning,

        @Schema(description = "Creation timestamp")
        ZonedDateTime createdOn,

        @Schema(description = "Created by user ID")
        String createdBy,

        @Schema(description = "Last modified timestamp")
        ZonedDateTime lastModifiedOn,

        @Schema(description = "Last modified by user ID")
        String lastModifiedBy
) {
}
