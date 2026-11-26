package com.utm.connectivity.viewmodel.integration;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Aggregated fleet connectivity status for an OEM manufacturer")
public record IntegrationStatusVm(
        String manufacturer,
        int totalDrones,
        int onlineDrones,
        List<IntegrationDroneStatusVm> drones
) {
}
