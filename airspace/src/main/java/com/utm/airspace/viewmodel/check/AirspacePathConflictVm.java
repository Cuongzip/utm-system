package com.utm.airspace.viewmodel.check;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Conflict detail along a sampled flight trajectory")
public record AirspacePathConflictVm(
        String zoneId,
        String name,
        String zoneType,
        Double altitudeFloor,
        Double altitudeCeiling,
        String source,
        String severity,
        AirspaceCheckPointVm conflictPoint,
        Integer segmentIndex,
        Double distanceFromStartM,
        String reason
) {
    public AirspacePathConflictVm(
            String zoneId,
            String name,
            String zoneType,
            Double altitudeCeiling,
            AirspaceCheckPointVm conflictPoint,
            Integer segmentIndex,
            Double distanceFromStartM,
            String reason
    ) {
        this(zoneId, name, zoneType, 0.0, altitudeCeiling, "local", "critical", conflictPoint, segmentIndex, distanceFromStartM, reason);
    }

    public AirspacePathConflictVm(
            String zoneId,
            String name,
            String zoneType,
            Double altitudeFloor,
            Double altitudeCeiling,
            AirspaceCheckPointVm conflictPoint,
            Integer segmentIndex,
            Double distanceFromStartM,
            String reason
    ) {
        this(zoneId, name, zoneType, altitudeFloor, altitudeCeiling, "local", "critical", conflictPoint, segmentIndex, distanceFromStartM, reason);
    }
}
