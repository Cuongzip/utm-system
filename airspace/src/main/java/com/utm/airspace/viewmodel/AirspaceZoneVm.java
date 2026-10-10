package com.utm.airspace.viewmodel;

import com.utm.airspace.model.enumeration.AirspaceZoneStatus;
import com.utm.airspace.model.enumeration.AirspaceZoneType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Detailed profile and spatial parameters of an Airspace Zone / Geofence")
public record AirspaceZoneVm(
        @Schema(description = "Unique UUID identifier of the airspace zone", example = "zone-sgn-palace-01")
        String id,

        @Schema(description = "Associated Hub ID if tied to a vertiport station", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
        String hubId,

        @Schema(description = "Name of the airspace zone", example = "Independence Palace No-Fly Zone")
        String name,

        @Schema(description = "Classification type: no_fly_zone | restricted | hub_corridor | warning", example = "no_fly_zone")
        AirspaceZoneType zoneType,

        @Schema(description = "Altitude ceiling limit in meters (m)", example = "120.0")
        Double altitudeCeiling,

        @Schema(description = "GeoJSON polygon geometry defining spatial boundary")
        GeoJsonPolygonVm geometry,

        @Schema(description = "Operational status: active | inactive", example = "active")
        AirspaceZoneStatus status,

        @Schema(description = "Detailed description, legal basis, or reason for restrictions", example = "Strict No-Fly Zone surrounding Independence Palace")
        String description,

        @Schema(description = "Record creation timestamp", example = "2026-09-30T10:00:00Z")
        ZonedDateTime createdOn,

        @Schema(description = "Username who created this zone", example = "admin")
        String createdBy,

        @Schema(description = "Last modification timestamp", example = "2026-09-30T10:30:00Z")
        ZonedDateTime lastModifiedOn,

        @Schema(description = "Username who last modified this zone", example = "admin")
        String lastModifiedBy
) {
}
