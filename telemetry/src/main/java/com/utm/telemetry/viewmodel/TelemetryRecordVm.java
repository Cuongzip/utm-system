package com.utm.telemetry.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.ZonedDateTime;

@Schema(description = "Telemetry record representation")
public record TelemetryRecordVm(
        @Schema(description = "Unique ID of the telemetry record", example = "550e8400-e29b-41d4-a716-446655440000")
        String id,

        @Schema(description = "Unique identifier of the reporting drone", example = "drone-01")
        String droneId,

        @Schema(description = "Associated flight operation ID", example = "flight-01")
        String flightId,

        @Schema(description = "Instantaneous WGS84 Latitude", example = "37.973")
        Double latitude,

        @Schema(description = "Instantaneous WGS84 Longitude", example = "23.733")
        Double longitude,

        @Schema(description = "Current altitude in meters (m)", example = "120.5")
        Double altitude,

        @Schema(description = "Ground speed in meters per second (m/s)", example = "14.2")
        Double speed,

        @Schema(description = "Compass heading angle in degrees (0-360°)", example = "85.0")
        Double heading,

        @Schema(description = "Pitch angle in degrees", example = "1.5")
        Double pitch,

        @Schema(description = "Roll angle in degrees", example = "-0.8")
        Double roll,

        @Schema(description = "Yaw angle in degrees", example = "85.0")
        Double yaw,

        @Schema(description = "Remaining battery percentage (0-100%)", example = "88.5")
        Double batteryPercentage,

        @Schema(description = "Telemetry record timestamp")
        ZonedDateTime timestamp
) {
}
