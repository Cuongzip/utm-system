package com.utm.hub.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Paginated list response of hubs / vertiports")
public record HubListVm(
        @Schema(description = "List of hub items")
        List<HubVm> items,

        @Schema(description = "Total number of hubs matching criteria", example = "10")
        long total
) {
    public static HubListVm of(List<HubVm> items, long total) {
        return new HubListVm(items, total);
    }
}
