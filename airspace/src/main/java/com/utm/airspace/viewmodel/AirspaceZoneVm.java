package com.utm.airspace.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.ZonedDateTime;

@Schema(description = "Detailed profile and spatial parameters of an Airspace Zone / Geofence")
public record AirspaceZoneVm(
        @Schema(description = "Unique UUID identifier of the airspace zone", example = "zone-ath-lgav-01")
        String id,

        @Schema(description = "Name of the airspace zone", example = "Athens Eleftherios Venizelos International Airport NFZ")
        String name,

        @Schema(description = "Classification type: restricted | prohibited | warning | corridor", example = "prohibited")
        String type,

        @Schema(description = "Floor altitude limit in meters (m)", example = "0.0")
        Double floorAltitudeM,

        @Schema(description = "Ceiling altitude limit in meters (m)", example = "1500.0")
        Double ceilingAltitudeM,

        @Schema(description = "GeoJSON polygon geometry defining spatial boundary")
        GeoJsonPolygonVm geometry,

        @Schema(description = "Associated Hub ID if tied to a vertiport station", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
        String hubId,

        @Schema(description = "Operational status: active | inactive", example = "active")
        String status,

        @Schema(description = "Detailed description, legal basis, or reason for restrictions", example = "Strict No-Fly Zone surrounding Athens International Airport")
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
