package com.utm.flight.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Paginated list response of flights")
public record FlightListVm(
        @Schema(description = "List of flight items")
        List<FlightVm> items,

        @Schema(description = "Total number of flights matching query criteria", example = "42")
        long total
) {
    public static FlightListVm of(List<FlightVm> items, long total) {
        return new FlightListVm(items != null ? items : List.of(), total);
    }
}
