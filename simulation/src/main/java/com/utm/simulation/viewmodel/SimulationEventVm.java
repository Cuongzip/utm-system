package com.utm.simulation.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Details of an emergency incident event generated during simulation")
public record SimulationEventVm(
        @Schema(description = "Event type", example = "SCENARIO_INJECTED")
        String type,

        @Schema(description = "Incident scenario identifier", example = "battery_drain")
        String scenario,

        @Schema(description = "Human-readable diagnostic description of the incident", example = "Battery drain scenario injected: rapid discharge triggered")
        String message,

        @Schema(description = "Incident severity level: LOW, MEDIUM, HIGH, CRITICAL", example = "CRITICAL")
        String severity
) {
}
