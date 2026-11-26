package com.utm.mission.service.client;

import com.utm.mission.config.ServiceUrlConfig;
import com.utm.mission.viewmodel.client.DroneBriefVm;
import com.utm.mission.viewmodel.client.DroneListClientVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
                    .body(DroneBriefVm.class);

            return Optional.ofNullable(drone);
        } catch (RestClientResponseException e) {
            log.warn("Drone service returned HTTP {} for droneId {}", e.getStatusCode(), droneId);
            return Optional.empty();
        } catch (Exception e) {
            log.error("Failed to query Drone service for ID {} at {}: {}", droneId, droneUrl, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public List<DroneBriefVm> getAvailableDronesAtHub(String hubId) {
        if (hubId == null || hubId.isBlank()) {
            return Collections.emptyList();
        }
        String droneUrl = serviceUrlConfig.getDroneUrl();
        try {
            DroneListClientVm result = restClient.get()
                    .uri(droneUrl + "/api/v1/drones?status=AVAILABLE&currentHubId={hubId}&limit=100", hubId.trim())
                    .retrieve()
                    .body(DroneListClientVm.class);

            if (result != null && result.items() != null) {
                return result.items();
            }
            return Collections.emptyList();
        } catch (RestClientResponseException e) {
            log.warn("Drone service returned HTTP {} when listing available drones at hub {}",
                    e.getStatusCode(), hubId);
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("Failed to query available drones at hub {} from {}: {}", hubId, droneUrl, e.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public boolean sendDroneCommand(String droneId, String commandType, String flightId, String parameters) {
        if (droneId == null || droneId.isBlank() || commandType == null || commandType.isBlank()) {
            return false;
        }
        String droneUrl = serviceUrlConfig.getDroneUrl();
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("commandType", commandType.trim().toUpperCase());
            if (flightId != null && !flightId.isBlank()) {
                body.put("flightId", flightId.trim());
            }
            if (parameters != null && !parameters.isBlank()) {
                body.put("parameters", parameters);
            }
            restClient.post()
                    .uri(droneUrl + "/api/v1/drones/{id}/commands", droneId.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception e) {
            log.warn("Failed to dispatch command {} to drone {}: {}", commandType, droneId, e.getMessage());
            return false;
        }
    }
}
