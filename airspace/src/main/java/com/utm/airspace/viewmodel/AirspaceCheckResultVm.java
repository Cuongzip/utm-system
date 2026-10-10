package com.utm.airspace.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "Result of 3D point airspace compliance check")
public record AirspaceCheckResultVm(
        @Schema(description = "True if coordinate point is safe and does not violate restricted or no-fly zones", example = "true")
        boolean safe,

        @Schema(description = "List of airspace violations detected")
        List<AirspaceViolationVm> violations
) {
}
