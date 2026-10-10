package com.utm.airspace.viewmodel;

import com.fasterxml.jackson.annotation.JsonAlias;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Conflict detail along a sampled flight trajectory")
public record AirspacePathConflictVm(
        @Schema(description = "ID of the conflicted airspace zone", example = "zone-sgn-palace-01")
        @JsonAlias("id")
        String zoneId,

        @Schema(description = "Name of the conflicted airspace zone", example = "Independence Palace No-Fly Zone")
        String name,

        @Schema(description = "Zone classification type: no_fly_zone | restricted | hub_corridor | warning", example = "no_fly_zone")
        @JsonAlias("type")
        String zoneType,

        @Schema(description = "Altitude ceiling limit in meters (m)", example = "120.0")
        Double altitudeCeiling,

        @Schema(description = "Sampled coordinate point where violation occurred")
        AirspaceCheckPointVm conflictPoint,

        @Schema(description = "Index of the trajectory segment where conflict was detected (0-based)", example = "1")
        Integer segmentIndex,

        @Schema(description = "Approximate distance along trajectory from origin in meters (m)", example = "450.0")
        Double distanceFromStartM,

        @Schema(description = "Explanatory reason describing the violation", example = "Trajectory intersects strictly forbidden airspace 'Independence Palace No-Fly Zone'")
        @JsonAlias("message")
        String reason
) {
}
