package com.utm.drone.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Paginated list response containing Drone Commands")
public record DroneCommandListVm(
        @Schema(description = "List of drone commands for the requested page")
        List<DroneCommandVm> items,

        @Schema(description = "Total count of drone command records matching the filter criteria", example = "15")
        long total
) {
    public static DroneCommandListVm of(List<DroneCommandVm> items, long total) {
        return new DroneCommandListVm(items, total);
    }
}
