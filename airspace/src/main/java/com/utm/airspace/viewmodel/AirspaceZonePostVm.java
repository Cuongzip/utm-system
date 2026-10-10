package com.utm.airspace.viewmodel;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.utm.airspace.model.enumeration.AirspaceZoneStatus;
import com.utm.airspace.model.enumeration.AirspaceZoneType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

@Schema(description = "Request payload for creating a new Airspace Zone / Geofence")
public record AirspaceZonePostVm(
        @Schema(description = "Unique name of the airspace zone", example = "Independence Palace No-Fly Zone")
        @NotBlank(message = "Name cannot be blank")
        String name,

        @Schema(description = "Associated Hub ID if tied to a vertiport station (null for general zones)", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
        String hubId,

        @Schema(description = "Classification type: no_fly_zone | restricted | hub_corridor | warning", example = "no_fly_zone")
        @NotNull(message = "Zone type is required")
        @JsonAlias({"type", "zoneType"})
        AirspaceZoneType zoneType,

        @Schema(description = "GeoJSON polygon geometry defining spatial boundary")
        @NotNull(message = "Geometry is required")
        @Valid
        GeoJsonPolygonVm geometry,

        @Schema(description = "Altitude ceiling limit in meters (m)", example = "120.0", defaultValue = "120.0")
        @PositiveOrZero(message = "Altitude ceiling must be >= 0")
        @JsonAlias({"ceilingAltitudeM", "altitudeCeiling"})
        Double altitudeCeiling,

        @Schema(description = "Operational status: active | inactive", example = "active", defaultValue = "active")
        AirspaceZoneStatus status,

        @Schema(description = "Detailed description or operational constraints", example = "Strict permanent no-fly restriction over historical landmark")
        String description
) {
    public Double altitudeCeiling() {
        return altitudeCeiling != null ? altitudeCeiling : 120.0;
    }

    public AirspaceZoneStatus status() {
        return status != null ? status : AirspaceZoneStatus.ACTIVE;
    }
}
