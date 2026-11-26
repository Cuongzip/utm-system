package com.utm.conflict.viewmodel.conflict;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

@Schema(description = "Ranked tactical deconfliction maneuver option for ATC / operators")
public record ResolutionAdviceOptionVm(
        @Schema(description = "Resolution strategy key compatible with POST /api/v1/conflicts/{id}/resolve", example = "altitude_change")
        String strategy,

        @Schema(description = "Preference rank (1 = top recommendation)", example = "1")
        int rank,

        @Schema(description = "Target drone C2 command type to be dispatched", example = "SET_ALTITUDE")
        String commandType,

        @Schema(description = "Recommended action parameters payload for the resolve endpoint")
        Map<String, Object> recommendedActions,

        @Schema(description = "Expected additional separation margin gained in meters", example = "40.0")
        double expectedSeparationGainM,

        @Schema(description = "Estimated schedule delay impact in seconds", example = "15")
        int estimatedDelaySeconds,

        @Schema(description = "Explanation of why this maneuver is recommended")
        String rationale
) {
}
