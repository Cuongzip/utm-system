package com.utm.mission.viewmodel.execution;

import com.utm.mission.model.enumeration.ExecutionMode;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Comprehensive dry-run multi-leg execution plan for a mission")
public record MissionExecutionPlanVm(
        String missionId,
        String missionName,
        ExecutionMode recommendedMode,
        int totalLegs,
        double totalDistanceMeters,
        long totalDurationSeconds,
        double totalEnergyWh,
        boolean feasible,
        List<String> warnings,
        List<PlannedLegVm> legs
) {
}
