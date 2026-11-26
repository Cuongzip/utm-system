package com.utm.connectivity.service.client;

import com.utm.connectivity.config.ServiceUrlConfig;
import com.utm.connectivity.viewmodel.client.DroneBriefVm;
import com.utm.connectivity.viewmodel.client.DroneCreateClientVm;
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
import java.util.List;
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

        String targetUrl = serviceUrlConfig.getDroneUrl() + "/api/v1/drones/{id}?enrich=false";
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

        List<DroneBriefVm> all = getAllDrones();
        Map<String, DroneBriefVm> result = new HashMap<>();
        for (DroneBriefVm drone : all) {
            if (drone != null && drone.id() != null && requestedIds.contains(drone.id())) {
                result.put(drone.id(), drone);
            }
        }
        return result;
    }

    @Override
    public List<DroneBriefVm> getAllDrones() {
        String targetUrl = serviceUrlConfig.getDroneUrl() + "/api/v1/drones?limit=0";
        try {
            DroneListClientVm response = restClient.get()
                    .uri(targetUrl)
                    .retrieve()
                    .body(DroneListClientVm.class);
            return (response != null && response.items() != null) ? response.items() : List.of();
        } catch (Exception e) {
            log.warn("Failed to list drones at url {}: {}", targetUrl, e.getMessage());
            return List.of();
        }
    }

    @Override
    public Optional<DroneBriefVm> createDrone(DroneCreateClientVm createVm) {
        String targetUrl = serviceUrlConfig.getDroneUrl() + "/api/v1/drones";
        try {
            DroneBriefVm created = restClient.post()
                    .uri(targetUrl)
                    .body(createVm)
                    .retrieve()
                    .body(DroneBriefVm.class);
            return (created != null && created.id() != null) ? Optional.of(created) : Optional.empty();
        } catch (Exception e) {
            log.warn("Failed to create OEM drone {}: {}", createVm.registrationNumber(), e.getMessage());
            return Optional.empty();
        }
    }
}
