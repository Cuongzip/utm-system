package com.utm.connectivity.viewmodel.telemetry;

import com.utm.connectivity.model.enumeration.TelemetryMode;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Payload to update a device's adaptive telemetry rate mode")
public record TelemetryModePutVm(
        @NotNull(message = "Telemetry mode is required")
        @Schema(description = "Target telemetry mode (idle, normal, enhanced, emergency)", example = "enhanced")
        TelemetryMode mode,

        @Size(max = 255, message = "Reason must not exceed 255 characters")
        @Schema(description = "Reason for telemetry rate adjustment", example = "Approaching geofence boundary")
        String reason
) {
}
