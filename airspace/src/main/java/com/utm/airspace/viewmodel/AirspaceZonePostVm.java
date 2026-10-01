package com.utm.airspace.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Request payload for creating a new Airspace Zone / Geofence")
public record AirspaceZonePostVm(
        @Schema(description = "Unique name of the airspace zone", example = "Syntagma Square Government NFZ")
        @NotBlank(message = "Name cannot be blank")
        String name,

        @Schema(description = "Classification type: restricted | prohibited | warning | corridor", example = "prohibited")
        @NotBlank(message = "Type cannot be blank")
        String type,

        @Schema(description = "Floor altitude limit in meters (m)", example = "0.0")
        @NotNull(message = "Floor altitude is required")
        Double floorAltitudeM,

        @Schema(description = "Ceiling altitude limit in meters (m)", example = "500.0")
        @NotNull(message = "Ceiling altitude is required")
        Double ceilingAltitudeM,

        @Schema(description = "GeoJSON polygon geometry defining spatial boundary")
        @NotNull(message = "Geometry is required")
        @Valid
        GeoJsonPolygonVm geometry,

        @Schema(description = "Associated Hub ID if tied to a vertiport station", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
        String hubId,

        @Schema(description = "Operational status: active | inactive", example = "active", defaultValue = "active")
        String status,

        @Schema(description = "Detailed description or operational constraints", example = "Permanent no-fly restriction over government quarter")
        String description
) {
    public String status() {
        return (status != null && !status.isBlank()) ? status : "active";
    }
}
