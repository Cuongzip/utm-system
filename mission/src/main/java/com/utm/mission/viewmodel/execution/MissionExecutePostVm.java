package com.utm.mission.viewmodel.execution;

import com.utm.mission.model.enumeration.ExecutionMode;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

@Schema(description = "Request payload for executing a mission across one or multiple flight legs")
public record MissionExecutePostVm(
        @Schema(description = "Assigned Drone UUID identifier (optional if autoAssign is true or legAssignments provided)", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String droneId,

        @Schema(description = "Assigned Remote Pilot ID or Keycloak User ID", example = "PILOT-VN-007")
        @NotBlank(message = "Pilot ID cannot be blank")
        String pilotId,

        @Schema(description = "Whether to let the Fleet Scoring Engine automatically select the best drone(s)", example = "false")
        Boolean autoAssign,

        @Schema(description = "Multi-leg execution coordination mode (same_drone_sequential or multi_drone_relay)")
        ExecutionMode executionMode,

        @Schema(description = "Optional explicit per-leg drone assignments for multi_drone_relay mode")
        @Valid
        List<LegDroneAssignmentVm> legAssignments,

        @Schema(description = "When true, automatically inserts an intermediate charging hub stop if a leg exceeds drone battery range")
        Boolean autoSplitByRange
) {
    public MissionExecutePostVm(String droneId, String pilotId) {
        this(droneId, pilotId, false, ExecutionMode.SAME_DRONE_SEQUENTIAL, null, false);
    }

    public MissionExecutePostVm(String droneId, String pilotId, Boolean autoAssign) {
        this(droneId, pilotId, autoAssign, ExecutionMode.SAME_DRONE_SEQUENTIAL, null, false);
    }
}
