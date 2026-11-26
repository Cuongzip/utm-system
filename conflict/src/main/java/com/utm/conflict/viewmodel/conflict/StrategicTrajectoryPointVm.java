package com.utm.conflict.viewmodel.conflict;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "3D coordinate point along a proposed 4D flight trajectory")
public record StrategicTrajectoryPointVm(
        @Schema(description = "Latitude in decimal degrees", example = "10.7769")
        double lat,

        @Schema(description = "Longitude in decimal degrees", example = "106.7009")
        double lon,

        @Schema(description = "Planned altitude in meters AGL", example = "60.0")
        double alt
) {
}
