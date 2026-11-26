package com.utm.connectivity.viewmodel.integration;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Drone and hardware registration summary created via OEM integration")
public record IntegrationDroneRegisteredVm(
        String id,
        String registrationNumber,
        String manufacturer,
        String model,
        String serialNumber,
        String status,
        String deviceId,
        String deviceIdentifier
) {
}
