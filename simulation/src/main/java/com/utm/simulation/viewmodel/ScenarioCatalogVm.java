package com.utm.simulation.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Information about an available emergency simulation scenario")
public record ScenarioCatalogVm(
                @Schema(description = "Scenario identifier code", example = "gps_failure") String type,

                @Schema(description = "Display name of the scenario", example = "Mất tín hiệu GPS") String name,

                @Schema(description = "Detailed technical explanation of the scenario effect", example = "Mất tín hiệu định vị GPS đột ngột, tọa độ bị sai lệch hoặc mất tín hiệu hoàn toàn.") String description,

                @Schema(description = "Default hazard severity: LOW, MEDIUM, HIGH, CRITICAL", example = "HIGH") String severity,

                @Schema(description = "Configurable parameter names for this scenario", example = "[\"driftDistanceMeters\", \"signalLossDurationSeconds\"]") List<String> parameters) {
}
