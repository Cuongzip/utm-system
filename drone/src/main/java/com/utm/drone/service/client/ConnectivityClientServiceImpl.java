package com.utm.drone.service.client;

import com.utm.drone.config.ServiceUrlConfig;
import com.utm.drone.viewmodel.client.DeviceRegistrationBriefVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConnectivityClientServiceImpl implements ConnectivityClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public Optional<DeviceRegistrationBriefVm> getDeviceByDroneId(String droneId) {
        if (droneId == null || droneId.isBlank()) {
            return Optional.empty();
        }
        String connectivityUrl = serviceUrlConfig.getConnectivityUrl();
        try {
            DeviceRegistrationBriefVm device = restClient.get()
                    .uri(connectivityUrl + "/api/v1/connectivity/devices/{id}?enrich=false", droneId.trim())
                    .retrieve()
                    .body(DeviceRegistrationBriefVm.class);
            return Optional.ofNullable(device);
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Failed to fetch connectivity registration for drone {} at {}: {}",
                    droneId, connectivityUrl, e.getMessage());
            return Optional.empty();
        }
    }
}
