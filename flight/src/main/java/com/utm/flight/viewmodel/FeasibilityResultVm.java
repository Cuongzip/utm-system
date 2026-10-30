package com.utm.flight.viewmodel;

import com.utm.flight.model.enumeration.Verdict;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.List;

@Schema(description = "Outcome of pre-flight feasibility and energy calculation")
public record FeasibilityResultVm(
        @Schema(description = "Flight UUID identifier", example = "550e8400-e29b-41d4-a716-446655440000")
        String flightId,

        @Schema(description = "Assigned Drone UUID identifier", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String droneId,

        @Schema(description = "Feasibility verdict (go, marginal, no_go, unknown)", example = "go")
        Verdict verdict,

        @Schema(description = "Net battery reserve margin percentage (%)", example = "22.5")
        Double marginPct,

        @Schema(description = "Net usable battery capacity in Watt-hours (Wh)", example = "384.0")
        Double usableWh,

        @Schema(description = "Total required mission energy in Watt-hours (Wh)", example = "297.6")
        Double requiredWh,

        @Schema(description = "Detailed energy consumption breakdown")
        EnergyBreakdownVm breakdown,

        @Schema(description = "Wind conditions utilized during evaluation")
        WindUsedVm windUsed,

        @Schema(description = "Evaluation confidence level (high, medium, low)", example = "high")
        String confidence,

        @Schema(description = "Recommended mitigations if verdict is marginal or no-go")
        List<FeasibilitySolutionVm> solutions,

        @Schema(description = "Summary explanation of evaluation outcome", example = "Usable battery: 384.0 Wh, Required: 297.6 Wh. Net margin: 22.5%. Verdict: GO.")
        String explanation,

        @Schema(description = "Source of explanation (deterministic, llm)", example = "deterministic")
        String explanationSource,

        @Schema(description = "Timestamp when evaluation was executed", example = "2026-10-30T10:00:00Z")
        ZonedDateTime evaluatedAt
) {
}
