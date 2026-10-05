package com.utm.flight.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Waypoint sequence mapping for reordering")
public record WaypointOrderItemVm(
        @Schema(description = "Waypoint UUID identifier", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        @NotBlank(message = "Waypoint ID cannot be blank")
        String waypointId,

        @Schema(description = "New sequence position (1-based index)", example = "1")
        @NotNull(message = "Sequence is required")
        Integer sequence
) {
}
