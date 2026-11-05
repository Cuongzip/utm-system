package com.utm.simulation.viewmodel.session;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.ZonedDateTime;

@Schema(description = "Details of an emergency incident event generated during simulation")
public record SimulationEventVm(
        @Schema(description = "Event UUID", example = "550e8400-e29b-41d4-a716-446655440000") String id,

        @Schema(description = "Event type", example = "SCENARIO_INJECTED") String type,

        @Schema(description = "Incident scenario identifier", example = "battery_drain") String scenario,

        @Schema(description = "Human-readable diagnostic description of the incident", example = "Battery drain scenario injected: rapid discharge triggered") String message,

        @Schema(description = "Incident severity level: LOW, MEDIUM, HIGH, CRITICAL", example = "CRITICAL") String severity,

        @Schema(description = "Timestamp when the event occurred") ZonedDateTime createdOn) {
}
