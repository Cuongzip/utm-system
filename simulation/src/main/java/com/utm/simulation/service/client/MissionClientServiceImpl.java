package com.utm.simulation.service.client;

import com.utm.simulation.config.ServiceUrlConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    public Optional<MissionSimulationVm> getMissionById(String missionId) {
        if (missionId == null || missionId.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.ofNullable(restClient.get()
                    .uri(serviceUrlConfig.getMissionUrl() + "/api/v1/missions/{id}", missionId.trim())
                    .retrieve()
                    .body(MissionSimulationVm.class));
        } catch (Exception ex) {
            log.warn("Failed to fetch mission {} in simulation service: {}", missionId, ex.getMessage());
            return Optional.empty();
        }
    }
}
