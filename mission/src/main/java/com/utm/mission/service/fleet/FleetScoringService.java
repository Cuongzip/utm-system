package com.utm.mission.service.fleet;

import com.utm.mission.viewmodel.fleet.ScoredDroneCandidateVm;

import java.util.List;

public interface FleetScoringService {

    List<ScoredDroneCandidateVm> scoreCandidateDrones(String missionId);

    ScoredDroneCandidateVm getBestCandidate(String missionId);
}
