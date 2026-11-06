package com.utm.organization.service.client;

import com.utm.organization.config.ServiceUrlConfig;
import com.utm.organization.viewmodel.client.DroneListClientVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@RequiredArgsConstructor
@Slf4j
public class DroneClientServiceImpl implements DroneClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public boolean hasActiveInFlightDrones(String organizationId) {
        if (organizationId == null || organizationId.isBlank()) {
            return false;
        }

        String droneUrl = serviceUrlConfig.drone();
        if (droneUrl == null || droneUrl.isBlank()) {
            log.warn("Drone service URL is not configured, skipping active flight check for organization {}", organizationId);
            return false;
        }

        String basePath = droneUrl.endsWith("/drone") ? "" : "/drone";
        try {
            DroneListClientVm response = restClient.get()
                    .uri(droneUrl + basePath + "/api/v1/drones?ownerId={ownerId}&status=in_flight&limit=1", organizationId.trim())
                    .retrieve()
                    .body(DroneListClientVm.class);

            return response != null && response.total() > 0;
        } catch (Exception e) {
            log.warn("Failed to check active in-flight drones for organization {} at {}: {}", organizationId, droneUrl, e.getMessage());
            return false;
        }
    }
}
