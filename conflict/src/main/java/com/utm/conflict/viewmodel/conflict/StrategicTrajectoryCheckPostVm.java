package com.utm.conflict.viewmodel.conflict;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.time.ZonedDateTime;
import java.util.List;

@Schema(description = "Strategic pre-flight 4D trajectory deconfliction request payload")
public record StrategicTrajectoryCheckPostVm(
        @NotEmpty(message = "Waypoints are required for 4D trajectory deconfliction")
        @Valid
        @Schema(description = "Ordered list of 3D waypoints defining the proposed trajectory")
        List<StrategicTrajectoryPointVm> waypoints,

        @Schema(description = "Proposed departure timestamp")
        ZonedDateTime scheduledDeparture,

        @Schema(description = "Proposed arrival timestamp")
        ZonedDateTime scheduledArrival,

        @Schema(description = "Nominal cruise speed in m/s (default 15.0)", example = "15.0")
        Double speedMps,

        @Schema(description = "Optional flight ID to exclude from conflict comparison (when re-checking an existing flight)")
        String excludeFlightId
) {
}
