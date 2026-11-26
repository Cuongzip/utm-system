package com.utm.connectivity.viewmodel.integration;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Acknowledgement after ingesting OEM telemetry")
public record IntegrationTelemetryResultVm(
        boolean success,
        String droneId,
        String deviceId,
        ZonedDateTime timestamp
) {
}
