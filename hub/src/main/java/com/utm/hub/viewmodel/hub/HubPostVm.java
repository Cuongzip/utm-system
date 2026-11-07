package com.utm.hub.viewmodel.hub;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

@Schema(description = "Request payload for registering a new Hub / Vertiport")
public record HubPostVm(
        @Schema(description = "Unique code / callsign identifier of the Hub (auto-generated if omitted)", example = "HUB-SGN-D1")
        @Size(min = 3, max = 50, message = "Code must be between 3 and 50 characters")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Code must contain only alphanumeric characters, dashes, and underscores")
        String code,

        @Schema(description = "Name of the Hub / Vertiport", example = "Central Vertiport Hub D1")
        @NotBlank(message = "Hub name is required")
        String name,

        @Schema(description = "GPS Location object containing latitude and longitude")
        @NotNull(message = "Location is required")
        @Valid
        LocationVm location,

        @Schema(description = "Altitude in meters above sea level", example = "12.5")
        @NotNull(message = "Altitude MSL is required")
        @PositiveOrZero(message = "Altitude MSL must be >= 0")
        Double altitudeMsl,

        @Schema(description = "Airspace protection radius in meters", example = "1500.0")
        @NotNull(message = "Airspace radius is required")
        @Positive(message = "Airspace radius must be positive")
        Double airspaceRadius
) {
}

