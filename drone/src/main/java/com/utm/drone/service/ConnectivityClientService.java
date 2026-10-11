package com.utm.drone.service;

import com.utm.drone.config.ServiceUrlConfig;
import com.utm.drone.viewmodel.DeviceRegistrationBriefVm;
import com.utm.drone.viewmodel.DeviceRegistrationListVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConnectivityClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    public Optional<DeviceRegistrationBriefVm> getDeviceRegistrationByDroneId(String droneId) {
        if (droneId == null || droneId.isBlank()) {
            return Optional.empty();
        }

        String connUrl = serviceUrlConfig.connectivity();
        if (connUrl == null || connUrl.isBlank()) {
            connUrl = "http://connectivity:8094";
        }
        String basePath = connUrl.endsWith("/connectivity") ? "" : "/connectivity";
        try {
            DeviceRegistrationListVm res = restClient.get()
                    .uri(connUrl + basePath + "/api/v1/connectivity/devices?search={droneId}&limit=1", droneId.trim())
                    .retrieve()
                    .body(DeviceRegistrationListVm.class);

            if (res != null && res.items() != null && !res.items().isEmpty()) {
                return Optional.of(res.items().get(0));
            }
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Failed to fetch device registration for drone {} at {}: {}", droneId, connUrl, e.getMessage());
            return Optional.empty();
        }
    }
}
