package com.utm.airspace.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "Result of flight route path airspace conflict check")
public record AirspaceCheckPathResultVm(
        @Schema(description = "True if entire trajectory path is allowed with no prohibited/restricted conflicts", example = "true")
        boolean isAllowed,

        @Schema(description = "List of airspace zones / conflicts detected along the trajectory")
        List<AirspacePathConflictVm> violatedZones
) {
}

