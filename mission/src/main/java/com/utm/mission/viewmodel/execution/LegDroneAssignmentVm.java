package com.utm.mission.viewmodel.execution;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Explicit drone assignment for a specific flight leg in multi-drone relay mode")
public record LegDroneAssignmentVm(
        @Schema(description = "Zero-based leg index", example = "0")
        @NotNull
        @Min(0)
        Integer legIndex,

        @Schema(description = "Assigned drone UUID for this leg")
        @NotBlank
        String droneId
) {
}
