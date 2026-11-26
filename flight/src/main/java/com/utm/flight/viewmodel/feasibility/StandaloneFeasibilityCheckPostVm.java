package com.utm.flight.viewmodel.feasibility;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

@Schema(description = "Standalone pre-flight energy & wind feasibility check request")
public record StandaloneFeasibilityCheckPostVm(
        @NotBlank(message = "Drone ID is required")
        String droneId,
        String missionId,
        String departureHubId,
        String arrivalHubId,
        @PositiveOrZero Double distanceM,
        @PositiveOrZero Double hoverTimeS,
        @PositiveOrZero Double payloadKg,
        @PositiveOrZero Double windSpeedMs
) {
}
