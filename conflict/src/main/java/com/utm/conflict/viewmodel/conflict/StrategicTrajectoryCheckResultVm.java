package com.utm.conflict.viewmodel.conflict;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Result of strategic 4D pre-flight trajectory deconfliction")
public record StrategicTrajectoryCheckResultVm(
        @Schema(description = "True if the 4D trajectory has zero separation conflicts")
        boolean clear,

        @Schema(description = "Total number of existing flights evaluated against the trajectory")
        int evaluatedFlightsCount,

        @Schema(description = "List of detected 4D separation conflicts")
        List<TrajectoryConflictDetailVm> conflicts,

        @Schema(description = "Strategic deconfliction recommendation")
        String recommendation
) {
}
