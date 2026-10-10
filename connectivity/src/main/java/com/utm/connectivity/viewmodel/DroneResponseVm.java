package com.utm.connectivity.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Drone details retrieved from Drone microservice")
public record DroneResponseVm(
        @Schema(description = "Drone UUID", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String id,

        @Schema(description = "Aircraft registration number", example = "SX-UAS-001")
        String registrationNumber,

        @Schema(description = "Drone aircraft model", example = "DJI Matrice 350 RTK")
        String model,

        @Schema(description = "Manufacturer name", example = "DJI")
        String manufacturer,

        @Schema(description = "Operational status", example = "available")
        String status
) {
}
