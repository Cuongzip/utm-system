package com.utm.airspace.viewmodel;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.utm.airspace.model.enumeration.AirspaceZoneStatus;
import com.utm.airspace.model.enumeration.AirspaceZoneType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.PositiveOrZero;

@Schema(description = "Request payload for updating an existing Airspace Zone / Geofence")
public record AirspaceZonePutVm(
        @Schema(description = "Updated name of the airspace zone", example = "Independence Palace No-Fly Zone - Expanded")
        String name,

        @Schema(description = "Updated associated Hub ID", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
        String hubId,

        @Schema(description = "Updated classification type: no_fly_zone | restricted | hub_corridor | warning", example = "restricted")
        @JsonAlias({"type", "zoneType"})
        AirspaceZoneType zoneType,

        @Schema(description = "Updated altitude ceiling limit in meters (m)", example = "150.0")
        @PositiveOrZero(message = "Altitude ceiling must be >= 0")
        @JsonAlias({"ceilingAltitudeM", "altitudeCeiling"})
        Double altitudeCeiling,

        @Schema(description = "Updated GeoJSON polygon geometry defining spatial boundary")
        @Valid
        GeoJsonPolygonVm geometry,

        @Schema(description = "Updated operational status: active | inactive", example = "active")
        AirspaceZoneStatus status,

        @Schema(description = "Updated detailed description or operational constraints", example = "Modified ceiling for high-altitude emergency transit")
        String description
) {
}
