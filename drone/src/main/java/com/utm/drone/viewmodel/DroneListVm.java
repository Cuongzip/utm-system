package com.utm.drone.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Paginated list response containing Drone / UAS entities and total count")
public record DroneListVm(
        @Schema(description = "List of drone entities for the requested page")
        List<DroneVm> items,

        @Schema(description = "Total count of drone records matching the filter criteria", example = "42")
        long total
) {
    public static DroneListVm of(List<DroneVm> items, long total) {
        return new DroneListVm(items, total);
    }
}
