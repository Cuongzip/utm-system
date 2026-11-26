package com.utm.connectivity.service.client;

import com.utm.connectivity.config.ServiceUrlConfig;
import com.utm.connectivity.viewmodel.client.TelemetryIngestClientVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelemetryClientServiceImpl implements TelemetryClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public boolean forwardTelemetry(TelemetryIngestClientVm payload) {
        try {
            return restClient.post()
                    .uri(serviceUrlConfig.getTelemetryUrl() + "/api/v1/telemetry")
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity()
                    .getStatusCode()
                    .is2xxSuccessful();
        } catch (Exception ex) {
            log.warn("Failed to forward OEM telemetry for drone {}: {}", payload.droneId(), ex.getMessage());
            return false;
        }
    }
}
