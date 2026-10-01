package com.utm.airspace.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Conflict detail along a sampled flight trajectory")
public record AirspacePathConflictVm(
        @Schema(description = "ID of the conflicted airspace zone", example = "zone-ath-lgav-01")
        String id,

        @Schema(description = "Name of the conflicted airspace zone", example = "Athens Eleftherios Venizelos International Airport NFZ")
        String name,

        @Schema(description = "Zone classification type: restricted | prohibited | warning | corridor", example = "prohibited")
        String type,

        @Schema(description = "Floor altitude limit in meters (m)", example = "0.0")
        Double floorAltitudeM,

        @Schema(description = "Ceiling altitude limit in meters (m)", example = "500.0")
        Double ceilingAltitudeM,

        @Schema(description = "Sampled coordinate point where violation occurred")
        AirspaceCheckPointVm conflictPoint,

        @Schema(description = "Index of the trajectory segment where conflict was detected (0-based)", example = "1")
        Integer segmentIndex,

        @Schema(description = "Approximate distance along trajectory from origin in meters (m)", example = "450.0")
        Double distanceFromStartM,

        @Schema(description = "Explanatory message describing the violation", example = "Sample point intersects Prohibited Zone (floor: 0m, ceiling: 1500m)")
        String message
) {
}

