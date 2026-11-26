package com.utm.flight.service.client;

import com.utm.flight.config.ServiceUrlConfig;
import com.utm.flight.viewmodel.client.MissionBriefClientVm;
import com.utm.flight.viewmodel.client.MissionExecutionStatusClientVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class MissionClientServiceImpl implements MissionClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public Optional<MissionBriefClientVm> getMissionById(String missionId) {
        if (missionId == null || missionId.isBlank()) {
            return Optional.empty();
        }
        try {
            MissionBriefClientVm mission = restClient.get()
                    .uri(serviceUrlConfig.getMissionUrl() + "/api/v1/missions/{id}", missionId.trim())
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    })
                    .body(MissionBriefClientVm.class);
            return (mission != null && mission.id() != null) ? Optional.of(mission) : Optional.empty();
        } catch (Exception ex) {
            log.warn("Failed to retrieve mission {}: {}", missionId, ex.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public Optional<String> getExecutionStatus(String executionId) {
        if (executionId == null || executionId.isBlank()) {
            return Optional.empty();
        }
        try {
            MissionExecutionStatusClientVm exec = restClient.get()
                    .uri(serviceUrlConfig.getMissionUrl() + "/api/v1/executions/{id}", executionId.trim())
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    })
                    .body(MissionExecutionStatusClientVm.class);
            return (exec != null && exec.status() != null) ? Optional.of(exec.status()) : Optional.empty();
        } catch (Exception ex) {
            log.warn("Failed to retrieve mission execution status {}: {}", executionId, ex.getMessage());
            return Optional.empty();
        }
    }
}
