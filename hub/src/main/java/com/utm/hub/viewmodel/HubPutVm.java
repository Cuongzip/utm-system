package com.utm.hub.viewmodel;

import com.utm.hub.model.enumeration.HubStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

@Schema(description = "Request payload for updating an existing Hub / Vertiport")
public record HubPutVm(
        @Schema(description = "Updated name of the Hub", example = "Athens Central Vertiport Alpha - Terminal 2")
        String name,

        @Schema(description = "Updated maximum drone capacity", example = "15")
        @Positive(message = "Capacity must be positive")
        Integer capacity,

        @Schema(description = "Updated operational status (active, maintenance, closed)", example = "maintenance")
        HubStatus status,

        @Schema(description = "Updated number of rapid charging pads", example = "6")
        @PositiveOrZero(message = "Charging pads must be zero or positive")
        Integer chargingPads,

        @Schema(description = "Updated altitude in meters", example = "125.0")
        Double altitude,

        @Schema(description = "Updated WGS84 Latitude coordinate", example = "37.983820")
        @DecimalMin(value = "-90.0", message = "Latitude must be >= -90.0")
        @DecimalMax(value = "90.0", message = "Latitude must be <= 90.0")
        Double latitude,

        @Schema(description = "Updated WGS84 Longitude coordinate", example = "23.727545")
        @DecimalMin(value = "-180.0", message = "Longitude must be >= -180.0")
        @DecimalMax(value = "180.0", message = "Longitude must be <= 180.0")
        Double longitude
) {
}
