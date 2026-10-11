package com.utm.mission.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Request payload for executing a mission")
public record MissionExecutePostVm(
        @Schema(description = "Assigned Drone UUID identifier", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        @NotBlank(message = "Drone ID cannot be blank")
        String droneId,

        @Schema(description = "Assigned Remote Pilot ID or Keycloak User ID", example = "PILOT-VN-007")
        @NotBlank(message = "Pilot ID cannot be blank")
        String pilotId
) {
}
