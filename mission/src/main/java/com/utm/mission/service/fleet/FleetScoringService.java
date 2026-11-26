package com.utm.mission.service.fleet;

import com.utm.mission.util.MissionLegUtils;
import com.utm.mission.viewmodel.fleet.ScoredDroneCandidateVm;

import java.util.List;

public interface FleetScoringService {

    List<ScoredDroneCandidateVm> scoreCandidateDrones(String missionId);

    ScoredDroneCandidateVm getBestCandidate(String missionId);

    default List<ScoredDroneCandidateVm> scoreCandidateDronesForLeg(MissionLegUtils.PlannedLegSpec leg) {
        return List.of();
    }

    default ScoredDroneCandidateVm getBestCandidateForLeg(MissionLegUtils.PlannedLegSpec leg) {
        throw new UnsupportedOperationException("getBestCandidateForLeg not implemented");
    }
}
