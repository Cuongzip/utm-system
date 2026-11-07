package com.utm.emergency.viewmodel.incident;

import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Payload to report and ingest a new emergency incident")
public record EmergencyIncidentPostVm(
        @Schema(description = "Incident investigation tracking number (e.g. INC-YYYYMMDD-XXXX). If omitted or blank, auto-generated.", example = "INC-20261107-A4B2")
        @Size(min = 3, max = 50, message = "Incident number must be between 3 and 50 characters")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Incident number must contain only alphanumeric characters, dashes, and underscores")
        String incidentNumber,

        @NotBlank(message = "Drone ID is required")
        @Schema(description = "UUID of reporting drone", example = "550e8400-e29b-41d4-a716-446655440000")
        String droneId,

        @Schema(description = "UUID of associated flight operation", example = "660e8400-e29b-41d4-a716-446655440001")
        String flightId,

        @NotNull(message = "Emergency type is required")
        @Schema(description = "Type of emergency event", example = "battery_critical")
        EmergencyType emergencyType,

        @NotNull(message = "Severity is required")
        @Schema(description = "Severity level", example = "critical")
        EmergencySeverity severity,

        @NotBlank(message = "Incident message is required")
        @Schema(description = "Human-readable summary message", example = "Critical battery drain detected at 8.5%")
        String message,

        @Schema(description = "Raw detection telemetry snapshot (JSON or Map)")
        Object detectionData,

        @Schema(description = "Current latitude coordinate", example = "10.7769")
        Double latitude,

        @Schema(description = "Current longitude coordinate", example = "106.7009")
        Double longitude,

        @Schema(description = "Current altitude in meters", example = "120.0")
        Double altitude
) {
}
