package com.utm.mission.viewmodel.execution;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Optional reason payload when aborting or pausing a mission execution")
public record MissionExecutionAbortPostVm(
        @Schema(description = "Operational reason for aborting execution", example = "Weather deterioration along leg 2")
        String reason
) {
}
