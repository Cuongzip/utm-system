package com.utm.alert.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Payload to publish or trigger an operational alert")
public record AlertPostVm(
        @Schema(description = "Type of alert: LATERAL_CORRIDOR_BREACH, VERTICAL_ALTITUDE_BREACH, 3D_VOLUME_BREACH, C2_LINK_LOST, BATTERY_LOW, etc.", example = "LATERAL_CORRIDOR_BREACH")
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

        @Schema(description = "Diagnostic or alert message description", example = "Drone cross-track deviation exceeds 15.0m corridor boundary")
        @NotBlank(message = "Message is required")
        String message,

        @Schema(description = "Detailed JSON payload or sensor data", example = "{\"crossTrackErrorM\": 18.2}")
        String detailsJson
) {}
