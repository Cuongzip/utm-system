package com.utm.mission.viewmodel.execution;

import com.utm.mission.model.enumeration.StopoverType;
import com.utm.mission.viewmodel.client.HubBriefVm;
import com.utm.mission.viewmodel.fleet.ScoredDroneCandidateVm;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Dry-run preview plan of an individual leg decomposed from a mission")
public record PlannedLegVm(
        int legIndex,
        String departureHubId,
        String departureHubName,
        String arrivalHubId,
        String arrivalHubName,
        StopoverType stopoverType,
        int groundTimeMinutes,
        double distanceMeters,
        long estimatedDurationSeconds,
        double payloadWeightKg,
        double estimatedEnergyWh,
        boolean airspaceSafe,
        List<String> airspaceWarnings,
        List<ScoredDroneCandidateVm> candidateDrones,
        List<HubBriefVm> recommendedChargingHubs
) {
}
