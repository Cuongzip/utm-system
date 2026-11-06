package com.utm.mission.service.client;

import com.utm.mission.config.ServiceUrlConfig;
import com.utm.mission.viewmodel.client.DroneBriefVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class DroneClientServiceImpl implements DroneClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public Optional<DroneBriefVm> getDroneById(String droneId) {
        if (droneId == null || droneId.isBlank()) {
            return Optional.empty();
        }
        String droneUrl = serviceUrlConfig.getDroneUrl();
        try {
            DroneBriefVm drone = restClient.get()
                    .uri(droneUrl + "/api/v1/drones/{id}", droneId.trim())
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, resp) ->
                            log.warn("Drone service returned client error {} for droneId: {}", resp.getStatusCode(), droneId))
                    .body(DroneBriefVm.class);

            return Optional.ofNullable(drone);
        } catch (Exception e) {
            log.error("Failed to query Drone service for ID {} at {}: {}", droneId, droneUrl, e.getMessage());
            return Optional.empty();
        }
    }
}
