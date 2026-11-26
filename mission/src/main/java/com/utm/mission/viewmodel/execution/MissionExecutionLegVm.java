package com.utm.mission.viewmodel.execution;

import com.utm.mission.model.enumeration.LegStatus;
import com.utm.mission.model.enumeration.StopoverType;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Execution status and flight binding of a single leg inside a multi-leg mission")
public record MissionExecutionLegVm(
        String id,
        String executionId,
        Integer legIndex,
        String flightId,
        String droneId,
        String departureHubId,
        String arrivalHubId,
        StopoverType stopoverType,
        Integer groundTimeMinutes,
        Double estimatedEnergyWh,
        LegStatus status
) {
}
