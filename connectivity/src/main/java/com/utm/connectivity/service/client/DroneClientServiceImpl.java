package com.utm.connectivity.service.client;

import com.utm.connectivity.config.ServiceUrlConfig;
import com.utm.connectivity.viewmodel.client.DroneBriefVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
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

        String droneBase = serviceUrlConfig.drone();
        if (droneBase == null || droneBase.isBlank()) {
            droneBase = "http://drone:8085";
        }

        String cleanUrl = droneBase.replaceAll("/+$", "");
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
