package com.utm.hub.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

@Schema(description = "Request payload for registering a new Hub / Vertiport")
public record HubPostVm(
        @Schema(description = "Name of the Hub / Vertiport", example = "Athens Central Vertiport Alpha")
        @NotBlank(message = "Hub name is required")
        String name,

        @Schema(description = "Unique code / callsign identifier of the Hub", example = "HUB-ATH-01")
        @NotBlank(message = "Hub code is required")
        String code,

        @Schema(description = "WGS84 Latitude coordinate (-90 to 90)", example = "37.983810")
        @NotNull(message = "Latitude is required")
        @DecimalMin(value = "-90.0", message = "Latitude must be >= -90.0")
        @DecimalMax(value = "90.0", message = "Latitude must be <= 90.0")
        Double latitude,

        @Schema(description = "WGS84 Longitude coordinate (-180 to 180)", example = "23.727539")
        @NotNull(message = "Longitude is required")
        @DecimalMin(value = "-180.0", message = "Longitude must be >= -180.0")
        @DecimalMax(value = "180.0", message = "Longitude must be <= 180.0")
        Double longitude,

        @Schema(description = "Altitude in meters above sea level", example = "120.5")
        Double altitude,

        @Schema(description = "Maximum drone capacity", example = "10")
        @NotNull(message = "Capacity is required")
        @Positive(message = "Capacity must be positive")
        Integer capacity,

        @Schema(description = "Number of rapid charging pads available", example = "4")
        @PositiveOrZero(message = "Charging pads must be zero or positive")
        Integer chargingPads
) {
}
