package com.utm.mission.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Paginated list of missions")
public record MissionListVm(
        @Schema(description = "Array of mission items in the current page")
        List<MissionVm> items,

        @Schema(description = "Total number of records matching the query filters", example = "42")
        long total
) {
    public static MissionListVm of(List<MissionVm> items, long total) {
        return new MissionListVm(items, total);
    }
}
