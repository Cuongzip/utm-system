package com.utm.flight.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

@Schema(
        description = "Payload for reordering waypoints in a flight trajectory",
        example = """
        {
          "order": [
            { "waypointId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "sequence": 1 },
            { "waypointId": "b2c3d4e5-f6a7-8901-bcde-f12345678901", "sequence": 2 }
          ]
        }
        """
)
public record WaypointReorderVm(
        @Schema(description = "List of waypoint order mappings")
        @NotEmpty(message = "Order list cannot be empty")
        List<@Valid WaypointOrderItemVm> order
) {
}
