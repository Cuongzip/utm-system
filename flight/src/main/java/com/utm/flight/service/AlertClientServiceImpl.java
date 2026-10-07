package com.utm.flight.service;

import com.utm.flight.config.ServiceUrlConfig;
import com.utm.flight.viewmodel.AlertPostVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertClientServiceImpl implements AlertClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public void createAlert(AlertPostVm postVm) {
        if (postVm == null) {
            return;
        }

        String baseUrl = serviceUrlConfig.alert();
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "http://alert:8093";
        }

        String basePath = baseUrl.endsWith("/alert") ? "" : "/alert";
        String endpoint = baseUrl + basePath + "/api/v1/alerts";

        try {
            restClient.post()
                    .uri(endpoint)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(postVm)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Dispatched alert [{}] for flight '{}' to alert-service",
                    postVm.alertType(), postVm.flightId());
        } catch (Exception ex) {
            log.warn("Failed to dispatch alert to alert-service at '{}': {}", endpoint, ex.getMessage());
        }
    }
}

