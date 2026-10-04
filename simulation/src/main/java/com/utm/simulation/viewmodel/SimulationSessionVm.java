package com.utm.simulation.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Details of a virtual flight simulation session")
public record SimulationSessionVm(
                @Schema(description = "Unique simulation session ID", example = "550e8400-e29b-41d4-a716-446655440000") String id,

                @Schema(description = "Drone hardware ID", example = "drone-sim-01") String droneId,

                @Schema(description = "Associated flight mission ID", example = "mission-01") String missionId,

                @Schema(description = "Departure hub ID", example = "hub-01") String departureHubId,

                @Schema(description = "Arrival hub ID", example = "hub-02") String arrivalHubId,

                @Schema(description = "Current lifecycle status: running, paused, stopped, completed", example = "running") String status,

                @Schema(description = "Current simulated speed in m/s", example = "15.0") Double speed,

                @Schema(description = "Current time-scale acceleration factor", example = "1.0") Double timeScale,

                @Schema(description = "Current latitude in WGS84 degrees", example = "10.776900") Double currentLat,

                @Schema(description = "Current longitude in WGS84 degrees", example = "106.700900") Double currentLon,

                @Schema(description = "Current altitude in meters", example = "50.0") Double currentAlt,

                @Schema(description = "Current heading in degrees (0-360)", example = "45.0") Double currentHeading,

                @Schema(description = "Current battery percentage (0-100%)", example = "98.5") Double currentBattery,

                @Schema(description = "Trajectory completion progress percentage (0-100%)", example = "42.5") Double progress,

                @Schema(description = "Total trajectory distance in meters", example = "1250.0") Double totalDistance,

                @Schema(description = "Total distance traveled so far in meters", example = "530.0") Double traveledDistance,

                @Schema(description = "Current active waypoint segment index (0-based)", example = "1") Integer currentSegment,

                @Schema(description = "Total number of waypoints on the path", example = "5") Integer totalWaypoints,

                @Schema(description = "Currently active injected emergency scenario, if any", example = "gps_failure") String activeScenario,

                @Schema(description = "Creation timestamp (ISO-8601 UTC)") ZonedDateTime createdOn,

                @Schema(description = "Last update timestamp (ISO-8601 UTC)") ZonedDateTime lastModifiedOn) {
}
