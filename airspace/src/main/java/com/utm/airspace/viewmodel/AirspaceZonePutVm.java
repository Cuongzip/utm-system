package com.utm.airspace.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;

@Schema(description = "Request payload for updating an existing Airspace Zone / Geofence")
public record AirspaceZonePutVm(
        @Schema(description = "Updated name of the airspace zone", example = "Syntagma Square Government NFZ (Updated)")
        String name,

        @Schema(description = "Updated classification type: restricted | prohibited | warning | corridor", example = "restricted")
        String type,

        @Schema(description = "Updated floor altitude limit in meters (m)", example = "50.0")
        Double floorAltitudeM,

        @Schema(description = "Updated ceiling altitude limit in meters (m)", example = "600.0")
        Double ceilingAltitudeM,

        @Schema(description = "Updated GeoJSON polygon geometry defining spatial boundary")
        @Valid
        GeoJsonPolygonVm geometry,

        @Schema(description = "Updated associated Hub ID", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
        String hubId,

        @Schema(description = "Updated operational status: active | inactive", example = "active")
        String status,

        @Schema(description = "Updated detailed description or notes", example = "Modified ceiling for emergency operations")
        String description
) {
}
