package com.utm.flight.service.client;

import com.utm.flight.config.ServiceUrlConfig;
import com.utm.flight.viewmodel.client.DroneBriefVm;
import com.utm.flight.viewmodel.feasibility.DroneEnergySpecVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class DroneClientServiceImpl implements DroneClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public boolean checkDroneExists(String droneId) {
        return getDroneById(droneId).isPresent();
    }

    @Override
    public Optional<DroneBriefVm> getDroneById(String droneId) {
        if (droneId == null || droneId.isBlank()) {
            return Optional.empty();
        }

        String endpoint = serviceUrlConfig.getDroneUrl() + "/api/v1/drones/{id}";
        try {
            DroneBriefVm drone = restClient.get()
                    .uri(endpoint, droneId.trim())
                    .retrieve()
                    .body(DroneBriefVm.class);
            return Optional.ofNullable(drone);
        } catch (RestClientResponseException e) {
            log.warn("Drone {} verification returned status {}", droneId, e.getStatusCode());
            return Optional.empty();
        } catch (Exception e) {
            log.error("Failed to fetch drone ID {} at url {}: {}", droneId, endpoint, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public Optional<DroneEnergySpecVm> getDroneEnergySpec(String droneId) {
        return getDroneById(droneId).map(drone -> new DroneEnergySpecVm(
                drone.batteryCapacityWh(),
                drone.hoverPowerW(),
                drone.cruisePowerW(),
                drone.cruiseSpeedMs(),
                drone.batteryHealthPct(),
                drone.windToleranceMs(),
                drone.maxPayload(),
                drone.maxFlightTimeMin(),
                drone.currentBatteryPct()
        ));
    }

    @Override
    public void sendDroneCommand(String droneId, String commandType, String flightId, String payloadJson) {
        if (droneId == null || droneId.isBlank() || commandType == null || commandType.isBlank()) {
            return;
        }
        String endpoint = serviceUrlConfig.getDroneUrl() + "/api/v1/drones/{id}/commands";
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("commandType", commandType.toLowerCase());
        body.put("priority", 1);
        if (flightId != null && !flightId.isBlank()) {
            body.put("flightId", flightId);
        }
        if (payloadJson != null && !payloadJson.isBlank()) {
            body.put("parameters", payloadJson);
        }
        try {
            restClient.post()
                    .uri(endpoint, droneId.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Dispatched {} command to drone {} for flight {}", commandType, droneId, flightId);
        } catch (Exception ex) {
            log.warn("Failed to dispatch {} command to drone {}: {}", commandType, droneId, ex.getMessage());
        }
    }
}


