package com.utm.connectivity.viewmodel.integration;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.ZonedDateTime;
import java.util.List;

@Schema(description = "Payload to create a new OEM manufacturer integration API key")
public record ManufacturerApiKeyPostVm(
        @NotBlank(message = "API key name is required")
        @Size(max = 255, message = "API key name must not exceed 255 characters")
        @Schema(description = "Human-readable key name", example = "DJI Cloud Bridge Production")
        String name,

        @NotBlank(message = "Manufacturer name is required")
        @Size(max = 255, message = "Manufacturer name must not exceed 255 characters")
        @Schema(description = "OEM manufacturer name", example = "DJI")
        String manufacturerName,

        @Schema(description = "Granted scopes (telemetry:write, drone:register, status:read)")
        List<String> scopes,

        @Positive(message = "Expiration days must be positive")
        @Schema(description = "Optional validity duration in days", example = "90")
        Integer expiresInDays,

        @Schema(description = "Optional explicit expiration timestamp")
        ZonedDateTime expiresAt
) {
}
