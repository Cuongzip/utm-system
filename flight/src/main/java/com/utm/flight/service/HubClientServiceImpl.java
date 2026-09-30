package com.utm.flight.service;

import com.utm.flight.config.ServiceUrlConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@RequiredArgsConstructor
@Slf4j
public class HubClientServiceImpl implements HubClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public boolean checkHubExists(String hubId) {
        if (hubId == null || hubId.isBlank()) {
            return false;
        }

        String hubUrl = serviceUrlConfig.hub();
        String basePath = hubUrl.endsWith("/hub") ? "" : "/hub";
        try {
            return Boolean.TRUE.equals(restClient.get()
                    .uri(hubUrl + basePath + "/api/v1/hubs/{id}", hubId.trim())
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
                        log.warn("Hub {} verification returned status {}", hubId, response.getStatusCode());
                    })
                    .toBodilessEntity()
                    .getStatusCode()
                    .is2xxSuccessful());
        } catch (Exception e) {
            log.error("Failed to verify hub ID {} at url {}: {}", hubId, hubUrl, e.getMessage());
            return false;
        }
    }
}
