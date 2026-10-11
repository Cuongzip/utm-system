package com.utm.connectivity.service;

import com.utm.connectivity.viewmodel.DroneBriefVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class DroneClientService {

    private final RestClient restClient;

    @Value("${utm.services.drone:http://drone:8085}")
    private String droneServiceUrl;

    public Optional<DroneBriefVm> getDroneById(String droneId) {
        if (droneId == null || droneId.isBlank()) {
            return Optional.empty();
        }
        String cleanUrl = droneServiceUrl.endsWith("/") ? droneServiceUrl.substring(0, droneServiceUrl.length() - 1) : droneServiceUrl;
        String basePath = cleanUrl.endsWith("/drone") ? "" : "/drone";
        String targetUrl = cleanUrl + basePath + "/api/v1/drones/{id}";
        try {
            ResponseEntity<DroneBriefVm> response = restClient.get()
                    .uri(targetUrl, droneId.trim())
                    .retrieve()
                    .toEntity(DroneBriefVm.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && response.getBody().id() != null) {
                return Optional.of(response.getBody());
            }
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Failed to retrieve drone ID {} at url {}: {}", droneId, targetUrl, e.getMessage());
            return Optional.empty();
        }
    }
}
