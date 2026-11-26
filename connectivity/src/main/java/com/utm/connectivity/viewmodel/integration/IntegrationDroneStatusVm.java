package com.utm.connectivity.viewmodel.integration;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Drone operational and connectivity status for OEM manufacturer")
public record IntegrationDroneStatusVm(
        String id,
        String registrationNumber,
        String model,
        String status,
        String connectionStatus,
        ZonedDateTime lastSeen
) {
}
