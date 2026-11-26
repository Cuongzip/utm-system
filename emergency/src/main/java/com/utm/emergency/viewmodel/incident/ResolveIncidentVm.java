package com.utm.emergency.viewmodel.incident;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "Optional payload when manually resolving an emergency incident")
public record ResolveIncidentVm(
        @Schema(description = "Operator notes describing how the incident was resolved", example = "Drone safely landed and cleared by ATC")
        String resolutionNotes
) {
}
