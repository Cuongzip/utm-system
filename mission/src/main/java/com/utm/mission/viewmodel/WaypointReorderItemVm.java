package com.utm.mission.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Single item in waypoint reorder request")
public record WaypointReorderItemVm(
        @Schema(description = "Unique UUID of the waypoint", example = "550e8400-e29b-41d4-a716-446655440000")
        @NotBlank(message = "Waypoint ID is required")
        String waypointId,

        @Schema(description = "New target sequence order (1-based)", example = "1")
        @NotNull(message = "Sequence is required")
        @Min(value = 1, message = "Sequence must be at least 1")
        Integer sequence
) {
}
