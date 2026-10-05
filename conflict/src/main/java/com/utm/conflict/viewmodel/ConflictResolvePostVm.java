package com.utm.conflict.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

@Schema(description = "Payload to resolve an airspace conflict")
public record ConflictResolvePostVm(
        @NotBlank(message = "Resolution strategy is required")
        @Schema(description = "Resolution strategy (altitude_change, speed_adjustment, reroute, hold)", example = "altitude_change")
        String strategy,

        @NotNull(message = "Resolution actions payload is required")
        @Schema(description = "Detailed commands or directives to execute the resolution", example = "{\"flightId\": \"550e...\", \"climbToAltitude\": 150.0, \"targetSpeed\": 10.0}")
        Map<String, Object> actions
) {
}
