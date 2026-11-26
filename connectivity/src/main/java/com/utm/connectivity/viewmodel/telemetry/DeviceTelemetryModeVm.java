package com.utm.connectivity.viewmodel.telemetry;

import com.utm.connectivity.model.enumeration.TelemetryMode;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Result of updating a device's adaptive telemetry rate mode")
public record DeviceTelemetryModeVm(
        String deviceId,
        String deviceIdentifier,
        String droneId,
        TelemetryMode telemetryMode,
        String telemetryModeReason,
        double rateHz,
        int intervalMs,
        ZonedDateTime updatedAt
) {
}
