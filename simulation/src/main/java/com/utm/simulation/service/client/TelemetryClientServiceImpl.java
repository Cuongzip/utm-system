package com.utm.simulation.service.client;

import com.utm.commonlibrary.utils.ClientUrlUtils;
import com.utm.simulation.config.ServiceUrlConfig;
import com.utm.simulation.viewmodel.client.TelemetryPushVm;
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
    public void pushTelemetry(TelemetryPushVm telemetry) {
        pushTelemetry(telemetry, null);
    }

    @Override
    public void pushTelemetry(TelemetryPushVm telemetry, String bearerToken) {
        if (telemetry == null) {
            return;
        }

        String configured = serviceUrlConfig.telemetry() != null ? serviceUrlConfig.telemetry().url() : null;
        String baseUrl = ClientUrlUtils.normalizeBaseUrl(configured, "http://telemetry:8089", "telemetry");
        String endpoint = baseUrl + "/api/v1/telemetry";

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
