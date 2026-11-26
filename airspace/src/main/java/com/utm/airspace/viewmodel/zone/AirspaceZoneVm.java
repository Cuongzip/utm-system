package com.utm.airspace.viewmodel.zone;

import com.utm.airspace.model.enumeration.AirspaceZoneStatus;
import com.utm.airspace.model.enumeration.AirspaceZoneType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.Map;

@Schema(description = "Detailed profile and spatial parameters of an Airspace Zone / Geofence")
public record AirspaceZoneVm(
        String id,
        String code,
        String hubId,
        String name,
        AirspaceZoneType zoneType,
        Double altitudeCeiling,
        Double altitudeFloor,
        ZonedDateTime effectiveStart,
        ZonedDateTime effectiveEnd,
        Integer priority,
        Map<String, Object> rules,
        Map<String, Object> schedule,
        GeoJsonPolygonVm geometry,
        AirspaceZoneStatus status,
        String description,
        ZonedDateTime createdOn,
        String createdBy,
        ZonedDateTime lastModifiedOn,
        String lastModifiedBy
) {
    public AirspaceZoneVm(
            String id,
            String code,
            String hubId,
            String name,
            AirspaceZoneType zoneType,
            Double altitudeCeiling,
            GeoJsonPolygonVm geometry,
            AirspaceZoneStatus status,
            String description,
            ZonedDateTime createdOn,
            String createdBy,
            ZonedDateTime lastModifiedOn,
            String lastModifiedBy
    ) {
        this(id, code, hubId, name, zoneType, altitudeCeiling, 0.0, null, null,
                0, null, null, geometry, status, description, createdOn, createdBy, lastModifiedOn, lastModifiedBy);
    }
}
