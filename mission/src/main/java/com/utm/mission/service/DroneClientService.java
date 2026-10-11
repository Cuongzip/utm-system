package com.utm.mission.service;

import com.utm.mission.config.ServiceUrlConfig;
import com.utm.mission.viewmodel.DroneBriefVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class DroneClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    public Optional<DroneBriefVm> getDroneById(String droneId) {
        if (droneId == null || droneId.isBlank()) {
            return Optional.empty();
        }
        try {
            String baseUrl = serviceUrlConfig.drone() != null ? serviceUrlConfig.drone() : "http://drone:8085";
            String url = baseUrl + "/drone/api/v1/drones/" + droneId.trim();

            DroneBriefVm drone = restClient.get()
                    .uri(url)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, resp) -> {
                        log.warn("Drone service returned client error for droneId: {}", droneId);
                    })
                    .body(DroneBriefVm.class);

            return Optional.ofNullable(drone);
        } catch (Exception e) {
            log.error("Failed to query Drone service for ID: {}. Error: {}", droneId, e.getMessage());
            return Optional.empty();
        }
    }
}
