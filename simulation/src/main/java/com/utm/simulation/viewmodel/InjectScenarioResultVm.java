package com.utm.simulation.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Result of injecting an emergency scenario into a simulation session")
public record InjectScenarioResultVm(
    @Schema(description = "Whether the scenario injection was accepted and active", example = "true") boolean success,

    @Schema(description = "Details of the generated incident event") SimulationEventVm event) {
}
