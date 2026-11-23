package com.utm.mission.viewmodel.fleet;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Evaluation and score of a candidate drone for a mission")
public record ScoredDroneCandidateVm(
        @Schema(description = "Drone UUID identifier", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String droneId,

        @Schema(description = "Aircraft registration number / callsign", example = "VN-UAV-001")
        String registrationNumber,

        @Schema(description = "Manufacturer", example = "DJI")
        String manufacturer,

        @Schema(description = "Airframe model", example = "Matrice 350 RTK")
        String model,

        @Schema(description = "Maximum payload capacity in kg", example = "2.7")
        Double maxPayloadKg,

        @Schema(description = "Battery rated capacity in Wh", example = "588.0")
        Double batteryCapacityWh,

        @Schema(description = "Projected energy needed in Wh", example = "125.4")
        Double estimatedEnergyConsumptionWh,

        @Schema(description = "Battery reserve margin percentage above safety threshold", example = "42.5")
        Double batteryMarginPct,

        @Schema(description = "Whether the drone is eligible to fly this mission", example = "true")
        Boolean eligible,

        @Schema(description = "Reason for ineligibility if not eligible", example = "Insufficient payload capacity")
        String ineligibilityReason,

        @Schema(description = "Overall suitability score from 0.0 to 100.0", example = "92.4")
        Double finalScore
) {
}
