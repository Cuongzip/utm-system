package com.utm.drone.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@Schema(description = "Request payload for registering a new Drone / UAS")
public record DronePostVm(
        @Schema(description = "Unique aircraft registration number / identifier", example = "SX-UAS-001")
        @NotBlank(message = "Registration number is required")
        String registrationNumber,

        @Schema(description = "Model / airframe designation", example = "DJI Matrice 350 RTK")
        @NotBlank(message = "Model is required")
        String model,

        @Schema(description = "Manufacturer name", example = "DJI")
        @NotBlank(message = "Manufacturer is required")
        String manufacturer,

        @Schema(description = "Maximum horizontal speed in meters per second (m/s)", example = "23.0")
        @NotNull(message = "Max speed is required")
        @Positive(message = "Max speed must be positive")
        Double maxSpeedMps,

        @Schema(description = "Maximum flight endurance in minutes", example = "55")
        @NotNull(message = "Max flight time is required")
        @Positive(message = "Max flight time must be positive")
        Integer maxFlightTimeMin,

        @Schema(description = "Maximum payload capacity in kilograms (kg)", example = "2.7")
        Double maxPayloadKg,

        @Schema(description = "Identifier of currently assigned drone hub station", example = "hub-hcm-01")
        String currentHubId,

        @Schema(description = "Technical notes, payload sensors, or equipment details", example = "Equipped with Zenmuse H20T thermal sensor")
        String notes
) {
}


