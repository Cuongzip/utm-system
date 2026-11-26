package com.utm.airspace.viewmodel.zone;

import com.utm.airspace.model.enumeration.AirspaceZoneStatus;
import com.utm.airspace.model.enumeration.AirspaceZoneType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.ZonedDateTime;
import java.util.Map;

@Schema(description = "Request payload for updating an existing Airspace Zone / Geofence")
public record AirspaceZonePutVm(
        @Size(min = 1, max = 255, message = "Name must be between 1 and 255 characters")
        String name,
        String hubId,
        AirspaceZoneType zoneType,
        @PositiveOrZero(message = "Altitude ceiling must be >= 0")
        Double altitudeCeiling,
        @PositiveOrZero(message = "Altitude floor must be >= 0")
        Double altitudeFloor,
        ZonedDateTime effectiveStart,
        ZonedDateTime effectiveEnd,
        Integer priority,
        Map<String, Object> rules,
        Map<String, Object> schedule,
        @Valid
        GeoJsonPolygonVm geometry,
        AirspaceZoneStatus status,
        String description
) {
    public AirspaceZonePutVm(
            String name,
            String hubId,
            AirspaceZoneType zoneType,
            Double altitudeCeiling,
            GeoJsonPolygonVm geometry,
            AirspaceZoneStatus status,
            String description
    ) {
        this(name, hubId, zoneType, altitudeCeiling, null, null, null, null, null, null, geometry, status, description);
    }

    public AirspaceZonePutVm(
            String name,
            String hubId,
            AirspaceZoneType zoneType,
            Double altitudeCeiling,
            Double altitudeFloor,
            ZonedDateTime effectiveStart,
            ZonedDateTime effectiveEnd,
            GeoJsonPolygonVm geometry,
            AirspaceZoneStatus status,
            String description
    ) {
        this(name, hubId, zoneType, altitudeCeiling, altitudeFloor, effectiveStart, effectiveEnd, null, null, null, geometry, status, description);
    }
}
