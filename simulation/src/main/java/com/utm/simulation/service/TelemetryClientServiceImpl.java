package com.utm.simulation.service;

import com.utm.simulation.config.ServiceUrlConfig;
import com.utm.simulation.viewmodel.TelemetryPushVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelemetryClientServiceImpl implements TelemetryClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public void pushTelemetry(TelemetryPushVm telemetry, String bearerToken) {
        if (telemetry == null) {
            return;
        }

        String baseUrl = serviceUrlConfig.telemetry().url();
        String basePath = baseUrl.endsWith("/telemetry") ? "" : "/telemetry";
        String endpoint = baseUrl + basePath + "/api/v1/telemetry";

        try {
            var request = restClient.post()
                    .uri(endpoint)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(telemetry);

            if (bearerToken != null && !bearerToken.isBlank()) {
                request.header("Authorization", "Bearer " + bearerToken.replace("Bearer ", "").trim());
            }

            request.retrieve().toBodilessEntity();
            log.trace("Pushed simulation telemetry tick for drone '{}'", telemetry.droneId());
        } catch (Exception ex) {
            log.warn("Failed to push telemetry tick for drone '{}': {}", telemetry.droneId(), ex.getMessage());
        }
    }
}
