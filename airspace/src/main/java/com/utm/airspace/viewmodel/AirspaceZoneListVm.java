package com.utm.airspace.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Paginated list response of airspace zones and geofences")
public record AirspaceZoneListVm(
        @Schema(description = "List of airspace zone items")
        List<AirspaceZoneVm> items,

        @Schema(description = "Total number of airspace zones matching criteria", example = "10")
        long total
) {
    public static AirspaceZoneListVm of(List<AirspaceZoneVm> items, long total) {
        return new AirspaceZoneListVm(items, total);
    }
}
