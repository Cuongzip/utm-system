package com.utm.flight.viewmodel;

import com.utm.flight.model.enumeration.Verdict;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.List;

@Schema(description = "Historical feasibility evaluation record")
public record FeasibilityEvaluationVm(
        @Schema(description = "Unique evaluation record UUID", example = "550e8400-e29b-41d4-a716-446655440000")
        String id,

        @Schema(description = "Associated Flight UUID", example = "550e8400-e29b-41d4-a716-446655440000")
        String flightId,

        @Schema(description = "Assigned Drone UUID", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String droneId,

        @Schema(description = "Feasibility verdict", example = "go")
        Verdict verdict,

        @Schema(description = "Net battery reserve margin percentage (%)", example = "22.5")
        Double marginPct,

        @Schema(description = "Net usable battery capacity in Watt-hours (Wh)", example = "384.0")
        Double usableWh,

        @Schema(description = "Total required mission energy in Watt-hours (Wh)", example = "297.6")
        Double requiredWh,

        @Schema(description = "Detailed energy consumption breakdown")
        EnergyBreakdownVm breakdown,

        @Schema(description = "Wind speed in m/s used during evaluation", example = "4.2")
        Double windSpeedMs,

        @Schema(description = "Confidence level", example = "high")
        String confidence,

        @Schema(description = "Mitigation recommendations")
        List<FeasibilitySolutionVm> solutions,

        @Schema(description = "Explanation string")
        String explanation,

        @Schema(description = "Source of explanation", example = "deterministic")
        String explanationSource,

        @Schema(description = "Timestamp when evaluation was recorded", example = "2026-10-30T10:00:00Z")
        ZonedDateTime createdOn,

        @Schema(description = "Operator or service account that initiated the evaluation", example = "pilot-vn-01")
        String createdBy
) {
}
