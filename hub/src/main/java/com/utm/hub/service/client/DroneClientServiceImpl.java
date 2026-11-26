package com.utm.hub.service.client;

import com.utm.hub.config.ServiceUrlConfig;
import com.utm.hub.viewmodel.client.DroneListClientVm;
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
    public int countStationedDronesAtHub(String hubId) {
        if (hubId == null || hubId.isBlank()) {
            return 0;
        }
        try {
            DroneListClientVm response = restClient.get()
                    .uri(serviceUrlConfig.getDroneUrl() + "/api/v1/drones?hubId={hubId}&limit=0", hubId.trim())
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    })
                    .body(DroneListClientVm.class);
            if (response == null || response.items() == null) {
                return 0;
            }
            return response.items().size();
        } catch (Exception ex) {
            log.warn("Failed to count stationed drones at hub {}: {}", hubId, ex.getMessage());
            return 0;
        }
    }
}
