package com.utm.telemetry.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Payload for ingesting high-frequency drone telemetry data")
public record TelemetryIngestVm(
        @Schema(description = "Unique identifier of the reporting drone", example = "550e8400-e29b-41d4-a716-446655440000")
        @NotBlank(message = "Drone ID is required")
        String droneId,

        @Schema(description = "Associated flight operation ID if drone is in mission", example = "660e8400-e29b-41d4-a716-446655440001")
        String flightId,

        @Schema(description = "Instantaneous WGS84 Latitude", example = "10.7780")
        @NotNull(message = "Latitude is required")
        Double latitude,

        @Schema(description = "Instantaneous WGS84 Longitude", example = "106.7020")
        @NotNull(message = "Longitude is required")
        Double longitude,

        @Schema(description = "Current altitude above mean sea level in meters (m)", example = "85.2")
        @NotNull(message = "Altitude is required")
        Double altitude,

        @Schema(description = "Current ground speed in meters per second (m/s)", example = "14.5")
        Double speed,

        @Schema(description = "Compass heading angle in degrees (0-360°)", example = "45.0")
        Double heading,

        @Schema(description = "Pitch angle in degrees", example = "1.5")
        Double pitch,

        @Schema(description = "Roll angle in degrees", example = "-0.8")
        Double roll,

        @Schema(description = "Yaw angle in degrees", example = "45.0")
        Double yaw,

        @Schema(description = "Remaining battery percentage (0-100%)", example = "82.5")
        Double batteryPercentage
) {
}
