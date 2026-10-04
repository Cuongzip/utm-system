package com.utm.simulation.viewmodel;

import com.utm.simulation.model.enumeration.EmergencyScenarioType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

@Schema(description = "Payload to inject a live emergency incident scenario into a simulation session")
public record InjectScenarioVm(
        @Schema(
                description = "Type of incident scenario to inject: gps_failure, battery_drain, c2_lost, motor_failure, geofence_breach",
                example = "battery_drain"
        )
        @NotNull(message = "Emergency scenario type is required")
        EmergencyScenarioType scenario,

        @Schema(description = "Optional custom configuration parameters for the scenario")
        Map<String, Object> config
) {
}
