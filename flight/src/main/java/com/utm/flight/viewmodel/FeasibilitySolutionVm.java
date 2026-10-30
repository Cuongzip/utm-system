package com.utm.flight.viewmodel;

import com.utm.flight.model.enumeration.SolutionKind;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Mitigation solution or recommendation for marginal/no-go feasibility")
public record FeasibilitySolutionVm(
        @Schema(description = "Solution classification kind", example = "reduce_payload")
        String kind,

        @Schema(description = "Short human-readable title", example = "Reduce Payload")
        String label,

        @Schema(description = "Detailed actionable recommendation", example = "Reduce payload from 3.5 kg to 2.5 kg to meet the 15% energy margin requirement")
        String detail
) {
    public FeasibilitySolutionVm(SolutionKind kind, String label, String detail) {
        this(kind != null ? kind.getValue() : null, label, detail);
    }
}
