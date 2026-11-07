package com.utm.drone.viewmodel.drone;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

@Schema(description = "Request payload for registering a new Drone / UAS")
public record DronePostVm(
        @Schema(description = "Aircraft registration number / tail identifier. If omitted or blank, a unique number will be auto-generated (e.g. DRN-YYYY-XXXX).", example = "VN-UAV-001")
        @Size(min = 3, max = 50, message = "Registration number must be between 3 and 50 characters")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Registration number must contain only alphanumeric characters, dashes, and underscores")
        String registrationNumber,

        @Schema(description = "Manufacturer name", example = "DJI")
        @NotBlank(message = "Manufacturer is required")
        String manufacturer,

        @Schema(description = "Model / airframe designation", example = "Matrice 350 RTK")
        @NotBlank(message = "Model is required")
        String model,

        @Schema(description = "Identifier of the owner organization", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String ownerId,

        @Schema(description = "Identifier of base / home hub station", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
        String homeHubId,

        @Schema(description = "Rated battery capacity in Watt-hours (Wh)", example = "588.0")
        @NotNull(message = "Battery capacity is required")
        @Positive(message = "Battery capacity must be positive")
        Double batteryCapacityWh,

        @Schema(description = "Maximum payload capacity in kilograms (kg)", example = "2.7")
        @NotNull(message = "Max payload is required")
        @PositiveOrZero(message = "Max payload must be non-negative")
        Double maxPayload
) {
}

