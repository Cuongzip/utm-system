package com.utm.flight.viewmodel.feasibility;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "ATC authorization override for marginal or no-go feasibility verdicts")
public record FeasibilityOverridePostVm(
        @NotBlank(message = "Override justification reason is required")
        @Schema(description = "Operational justification / mitigation reason", example = "Emergency medical delivery authorized with active battery monitoring")
        String reason,

        @NotBlank(message = "Approving officer / authority identifier is required")
        @Schema(description = "ATC Controller or Hub Manager username / callsign", example = "atc-controller-01")
        String approvedBy
) {
}

