package com.utm.flight.viewmodel;

import com.utm.flight.model.enumeration.Verdict;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Internal energy calculation result details")
public record EnergyCalculationResultVm(
        Verdict verdict,
        double marginPct,
        double usableWh,
        double requiredWh,
        double cruiseWh,
        double hoverWh,
        double climbWh,
        double payloadFactor,
        double windFactor,
        String confidence,
        boolean windExceeded,
        List<FeasibilitySolutionVm> solutions,
        String explanation,
        String explanationSource
) {
}
