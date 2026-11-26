package com.utm.connectivity.viewmodel.integration;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

@Schema(description = "Payload for OEM 3rd-party telemetry ingestion via X-API-Key")
public record IntegrationTelemetryPostVm(
        @NotBlank(message = "Drone identifier or registration number is required")
        @Schema(description = "Drone UUID or registration number", example = "VN-UAV-001")
        String droneId,

        @Schema(description = "Optional active flight UUID")
        String flightId,

        @NotNull(message = "Latitude is required")
        @DecimalMin(value = "-90.0", message = "Latitude must be >= -90")
        @DecimalMax(value = "90.0", message = "Latitude must be <= 90")
        Double latitude,

        @NotNull(message = "Longitude is required")
        @DecimalMin(value = "-180.0", message = "Longitude must be >= -180")
        @DecimalMax(value = "180.0", message = "Longitude must be <= 180")
        Double longitude,

        @NotNull(message = "Altitude is required")
        @DecimalMin(value = "0.0", message = "Altitude must be >= 0")
        Double altitude,

        @DecimalMin(value = "0.0", message = "Heading must be >= 0")
        @DecimalMax(value = "360.0", message = "Heading must be <= 360")
        Double heading,

        @DecimalMin(value = "0.0", message = "Speed must be >= 0")
        Double speed,

        @DecimalMin(value = "0.0", message = "Battery level must be >= 0")
        @DecimalMax(value = "100.0", message = "Battery level must be <= 100")
        Double batteryLevel,

        Double pitch,
        Double roll,
        Double yaw,
        Double signalStrength,
        String flightMode,
        Boolean armed,
        Map<String, Object> custom
) {
}
