package com.utm.hub.viewmodel;

import com.utm.hub.model.enumeration.HubStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

@Schema(description = "Request payload for updating an existing Hub / Vertiport")
public record HubPutVm(
        @Schema(description = "Updated name of the Hub", example = "Central Vertiport Hub D1 - Expansion")
        String name,

        @Schema(description = "Updated altitude in meters above mean sea level", example = "15.0")
        @PositiveOrZero(message = "Altitude MSL must be >= 0")
        Double altitudeMsl,

        @Schema(description = "Updated airspace protection radius in meters", example = "1500.0")
        @Positive(message = "Airspace radius must be positive")
        Double airspaceRadius,

        @Schema(description = "Updated operational status (active, inactive, maintenance)", example = "maintenance")
        HubStatus status
) {
}
