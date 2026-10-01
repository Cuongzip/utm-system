package com.utm.airspace.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "Result of 3D point airspace compliance check")
public record AirspaceCheckResultVm(
        @Schema(description = "True if flight operation is allowed at this coordinate without violating prohibited/restricted zones", example = "true")
        boolean isAllowed,

        @Schema(description = "List of airspace zones intersected by this point")
        List<AirspaceZoneVm> violatedZones
) {
}
