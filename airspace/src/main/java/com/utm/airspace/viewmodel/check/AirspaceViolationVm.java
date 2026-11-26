package com.utm.airspace.viewmodel.check;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Airspace zone violation details")
public record AirspaceViolationVm(
        String zoneId,
        String name,
        String zoneType,
        Double altitudeFloor,
        Double altitudeCeiling,
        String source,
        String severity,
        String reason
) {
    public AirspaceViolationVm(String zoneId, String name, String zoneType, String reason) {
        this(zoneId, name, zoneType, 0.0, null, "local", "critical", reason);
    }

    public AirspaceViolationVm(
            String zoneId,
            String name,
            String zoneType,
            Double altitudeFloor,
            Double altitudeCeiling,
            String reason) {
        this(zoneId, name, zoneType, altitudeFloor, altitudeCeiling, "local", "critical", reason);
    }
}
