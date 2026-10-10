package com.utm.airspace.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Airspace zone violation details")
public record AirspaceViolationVm(
        @Schema(description = "ID of the conflicted airspace zone", example = "zone-sgn-palace-01")
        String zoneId,

        @Schema(description = "Name of the conflicted airspace zone", example = "Independence Palace No-Fly Zone")
        String name,

        @Schema(description = "Zone classification type", example = "no_fly_zone")
        String zoneType,

        @Schema(description = "Reason describing the violation", example = "Point falls inside strictly forbidden airspace")
        String reason
) {
}
