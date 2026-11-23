package com.utm.connectivity.service.client;

import com.utm.connectivity.config.ServiceUrlConfig;
import com.utm.connectivity.viewmodel.client.DroneBriefVm;
import com.utm.connectivity.viewmodel.client.DroneListClientVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

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

        String targetUrl = serviceUrlConfig.getDroneUrl() + "/api/v1/drones/{id}";
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

    @Override
    public Map<String, DroneBriefVm> getDronesByIds(Collection<String> droneIds) {
        if (droneIds == null || droneIds.isEmpty()) {
            return Collections.emptyMap();
        }

        Set<String> requestedIds = new HashSet<>();
        for (String id : droneIds) {
            if (id != null && !id.isBlank()) {
                requestedIds.add(id.trim());
            }
        }
        if (requestedIds.isEmpty()) {
            return Collections.emptyMap();
        }

        String targetUrl = serviceUrlConfig.getDroneUrl() + "/api/v1/drones?limit=0";
        try {
            DroneListClientVm response = restClient.get()
                    .uri(targetUrl)
                    .retrieve()
                    .body(DroneListClientVm.class);

            if (response == null || response.items() == null) {
                return Collections.emptyMap();
            }

            Map<String, DroneBriefVm> result = new HashMap<>();
            for (DroneBriefVm drone : response.items()) {
                if (drone != null && drone.id() != null && requestedIds.contains(drone.id())) {
                    result.put(drone.id(), drone);
                }
            }
            return result;
        } catch (Exception e) {
            log.warn("Failed to batch-retrieve drones at url {}: {}", targetUrl, e.getMessage());
            return Collections.emptyMap();
        }
    }
}
