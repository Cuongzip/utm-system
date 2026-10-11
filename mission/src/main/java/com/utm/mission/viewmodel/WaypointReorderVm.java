package com.utm.mission.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

@Schema(description = "Request payload to reorder waypoints for a mission")
public record WaypointReorderVm(
        @Schema(description = "List of waypoints and their desired sequence orders")
        @NotEmpty(message = "Order list must not be empty")
        @Valid
        List<WaypointReorderItemVm> order
) {
}
