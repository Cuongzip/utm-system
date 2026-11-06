package com.utm.simulation.viewmodel.session;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Paginated list response containing simulation sessions and total count")
public record SimulationSessionListVm(
        @Schema(description = "List of simulation sessions for the requested page")
        List<SimulationSessionVm> items,

        @Schema(description = "Total count of simulation sessions matching the filter criteria", example = "42")
        long total
) {
    public static SimulationSessionListVm of(List<SimulationSessionVm> items, long total) {
        return new SimulationSessionListVm(items, total);
    }
}

