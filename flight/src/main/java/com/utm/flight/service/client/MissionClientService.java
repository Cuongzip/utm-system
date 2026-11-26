package com.utm.flight.service.client;

import com.utm.flight.viewmodel.client.MissionBriefClientVm;

import java.util.Optional;

public interface MissionClientService {

    Optional<MissionBriefClientVm> getMissionById(String missionId);

    default Optional<String> getExecutionStatus(String executionId) {
        return Optional.empty();
    }
}
