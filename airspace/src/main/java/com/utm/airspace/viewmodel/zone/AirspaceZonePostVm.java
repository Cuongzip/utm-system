package com.utm.airspace.viewmodel.zone;

import com.utm.airspace.model.enumeration.AirspaceZoneStatus;
import com.utm.airspace.model.enumeration.AirspaceZoneType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.ZonedDateTime;
import java.util.Map;

@Schema(description = "Request payload for creating a new Airspace Zone / Geofence")
public record AirspaceZonePostVm(
        @Schema(description = "Unique name of the airspace zone")
        @NotBlank(message = "Name cannot be blank")
        @Size(min = 1, max = 255, message = "Name must be between 1 and 255 characters")
        String name,

        @Schema(description = "Airspace zone business tracking code (e.g. ASZ-A1B2). If omitted, system auto-generates.")
        @Size(min = 3, max = 50, message = "Code must be between 3 and 50 characters")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Code must contain only alphanumeric characters, dashes, and underscores")
        String code,

        @Schema(description = "Associated Hub ID if tied to a vertiport station")
        String hubId,

        @Schema(description = "Classification type")
        @NotNull(message = "Zone type is required")
        AirspaceZoneType zoneType,

        @Schema(description = "GeoJSON polygon geometry defining spatial boundary")
        @NotNull(message = "Geometry is required")
        @Valid
        GeoJsonPolygonVm geometry,

        @Schema(description = "Altitude ceiling limit in meters (m)", defaultValue = "120.0")
        @PositiveOrZero(message = "Altitude ceiling must be >= 0")
        Double altitudeCeiling,

        @Schema(description = "Altitude floor limit in meters (m)", defaultValue = "0.0")
        @PositiveOrZero(message = "Altitude floor must be >= 0")
        Double altitudeFloor,

        @Schema(description = "Optional effective start time")
        ZonedDateTime effectiveStart,

        @Schema(description = "Optional effective end time")
        ZonedDateTime effectiveEnd,

        @Schema(description = "Zone precedence priority (higher wins when overlapping)", defaultValue = "0")
        Integer priority,

        @Schema(description = "Operational rules JSON (maxSpeed, requiresAuthorization, allowedOrganizations, etc.)")
        Map<String, Object> rules,

        @Schema(description = "Recurring active schedule JSON")
        Map<String, Object> schedule,

        @Schema(description = "Operational status: active | inactive", defaultValue = "active")
        AirspaceZoneStatus status,

        @Schema(description = "Detailed description or operational constraints")
        String description
) {
    public AirspaceZonePostVm(
            String name,
            String code,
            String hubId,
            AirspaceZoneType zoneType,
            GeoJsonPolygonVm geometry,
            Double altitudeCeiling,
            AirspaceZoneStatus status,
            String description
    ) {
        this(name, code, hubId, zoneType, geometry, altitudeCeiling, 0.0, null, null, 0, null, null, status, description);
    }

    public AirspaceZonePostVm(
            String name,
            String code,
            String hubId,
            AirspaceZoneType zoneType,
            GeoJsonPolygonVm geometry,
            Double altitudeCeiling,
            Double altitudeFloor,
            ZonedDateTime effectiveStart,
            ZonedDateTime effectiveEnd,
            AirspaceZoneStatus status,
            String description
    ) {
        this(name, code, hubId, zoneType, geometry, altitudeCeiling, altitudeFloor, effectiveStart, effectiveEnd, 0, null, null, status, description);
    }

    public Double altitudeFloor() {
        return altitudeFloor != null ? altitudeFloor : 0.0;
    }

    public Double altitudeCeiling() {
        return altitudeCeiling != null ? altitudeCeiling : 120.0;
    }

    public Integer priority() {
        return priority != null ? priority : 0;
    }

    public AirspaceZoneStatus status() {
        return status != null ? status : AirspaceZoneStatus.ACTIVE;
    }
}
