package com.utm.flight.viewmodel.feasibility;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Breakdown of consumed energy components and adjustment factors")
public record EnergyBreakdownVm(
        @Schema(description = "Energy consumed during cruise phase in Watt-hours (Wh)", example = "145.2")
        Double cruiseWh,

        @Schema(description = "Energy consumed during hover phases in Watt-hours (Wh)", example = "25.0")
        Double hoverWh,

        @Schema(description = "Energy consumed for climb/maneuver surcharge in Watt-hours (Wh)", example = "25.5")
        Double climbWh,

        @Schema(description = "Payload multiplier factor", example = "1.2")
        Double payloadFactor,

        @Schema(description = "Wind resistance multiplier factor", example = "1.1")
        Double windFactor
) {
}

