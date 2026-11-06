package com.utm.flight.service.client;

import com.utm.flight.config.ServiceUrlConfig;
import com.utm.flight.viewmodel.client.DroneBriefVm;
import com.utm.flight.viewmodel.feasibility.DroneEnergySpecVm;
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
                    .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
                        log.warn("Drone {} verification returned status {}", droneId, response.getStatusCode());
                    })
                    .body(DroneBriefVm.class);
            return Optional.ofNullable(drone);
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
                drone.maxFlightTimeMin()
        ));
    }
}


