package com.utm.flight.viewmodel.feasibility;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Paginated list response of feasibility evaluations")
public record FeasibilityEvaluationListVm(
        @Schema(description = "List of feasibility evaluation records")
        List<FeasibilityEvaluationVm> items,

        @Schema(description = "Total number of evaluations matching query criteria", example = "10")
        long total
) {
    public static FeasibilityEvaluationListVm of(List<FeasibilityEvaluationVm> items, long total) {
        return new FeasibilityEvaluationListVm(items != null ? items : List.of(), total);
    }
}

