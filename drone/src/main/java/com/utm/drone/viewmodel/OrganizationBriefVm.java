package com.utm.drone.viewmodel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "Brief summary of owner organization")
public record OrganizationBriefVm(
        @Schema(description = "Organization UUID identifier", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String id,

        @Schema(description = "Organization name", example = "Drone Express Vietnam JSC")
        String name,

        @Schema(description = "Business registration number", example = "GP-2026-DK01")
        String registrationNumber,

        @Schema(description = "Organization classification type", example = "operator")
        String type
) {
}
