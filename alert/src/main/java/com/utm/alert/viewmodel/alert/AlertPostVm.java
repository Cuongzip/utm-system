package com.utm.alert.viewmodel.alert;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "Payload to publish or trigger an operational alert")
public record AlertPostVm(
        @Schema(description = "Type of alert: LATERAL_CORRIDOR_BREACH, VERTICAL_ALTITUDE_BREACH, 3D_VOLUME_BREACH, C2_LINK_LOST, BATTERY_LOW, AIRSPACE_BREACH, CONFLICT_PROXIMITY, EMERGENCY_INCIDENT, etc.", example = "LATERAL_CORRIDOR_BREACH")
        @NotBlank(message = "Alert type is required")
        @Size(max = 50)
        String alertType,

        @Schema(description = "Severity level: LOW, MEDIUM, HIGH, CRITICAL", example = "HIGH")
        String severity,

        @Schema(description = "Target flight UUID identifier")
        String flightId,

        @Schema(description = "Target drone UUID identifier")
        String droneId,

        @Schema(description = "Target hub UUID identifier")
        String hubId,

        @Schema(description = "Originating conflict UUID identifier (for auto-resolution)")
        String conflictId,

        @Schema(description = "Originating emergency incident UUID identifier (for auto-resolution)")
        String incidentId,

        @Schema(description = "Diagnostic or alert message description", example = "Drone cross-track deviation exceeds 15.0m corridor boundary")
        @NotBlank(message = "Message is required")
        String message,

        @Schema(description = "Structured JSON details payload or sensor metrics")
        Map<String, Object> detailsJson
) {
    public AlertPostVm(
            String alertType,
            String severity,
            String flightId,
            String droneId,
            String hubId,
            String message,
            Map<String, Object> detailsJson
    ) {
        this(alertType, severity, flightId, droneId, hubId, null, null, message, detailsJson);
    }
}

