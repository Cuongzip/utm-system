package com.utm.flight.service;

import com.utm.flight.config.ServiceUrlConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@RequiredArgsConstructor
@Slf4j
public class DroneClientServiceImpl implements DroneClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public boolean checkDroneExists(String droneId) {
        if (droneId == null || droneId.isBlank()) {
            return false;
        }

        String droneUrl = serviceUrlConfig.drone();
        String basePath = droneUrl.endsWith("/drone") ? "" : "/drone";
        try {
            return Boolean.TRUE.equals(restClient.get()
                    .uri(droneUrl + basePath + "/api/v1/drones/{id}", droneId.trim())
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
                        log.warn("Drone {} verification returned status {}", droneId, response.getStatusCode());
                    })
                    .toBodilessEntity()
                    .getStatusCode()
                    .is2xxSuccessful());
        } catch (Exception e) {
            log.error("Failed to verify drone ID {} at url {}: {}", droneId, droneUrl, e.getMessage());
            return false;
        }
    }
}
