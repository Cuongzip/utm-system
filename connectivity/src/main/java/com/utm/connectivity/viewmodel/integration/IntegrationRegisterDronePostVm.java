package com.utm.connectivity.viewmodel.integration;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

@Schema(description = "Payload for OEM 3rd-party drone registration via X-API-Key")
public record IntegrationRegisterDronePostVm(
        @NotBlank(message = "Registration number is required")
        @Size(min = 3, max = 50, message = "Registration number must be between 3 and 50 characters")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Registration number must contain only alphanumeric characters, dashes, and underscores")
        String registrationNumber,

        @Size(max = 100, message = "Manufacturer must not exceed 100 characters")
        String manufacturer,

        @NotBlank(message = "Model is required")
        @Size(max = 100, message = "Model must not exceed 100 characters")
        String model,

        @Size(max = 100, message = "Serial number must not exceed 100 characters")
        String serialNumber,

        String ownerId,
        String homeHubId,

        @Positive(message = "Battery capacity must be positive")
        Double batteryCapacityWh,

        @PositiveOrZero(message = "Max payload must be non-negative")
        Double maxPayload,

        @Positive(message = "Max flight time must be positive")
        Integer maxFlightTime,

        @Positive(message = "Max range must be positive")
        Double maxRange,

        @Positive(message = "Max speed must be positive")
        Double maxSpeed
) {
}
