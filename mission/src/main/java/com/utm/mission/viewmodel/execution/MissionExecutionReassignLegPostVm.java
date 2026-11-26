package com.utm.mission.viewmodel.execution;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Request payload for reassigning a replacement drone to an upcoming or paused mission leg")
public record MissionExecutionReassignLegPostVm(
        @Schema(description = "Replacement drone UUID stationed at the leg departure hub")
        @NotBlank(message = "Replacement droneId is required")
        String droneId,

        @Schema(description = "Reason for reassigning the drone", example = "Primary drone entered maintenance after leg 1")
        String reason
) {
}
