package com.utm.airspace.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@RequiredArgsConstructor
@Slf4j
public class HubClientService {

    private final RestClient restClient;

    @Value("${utm.services.hub:http://hub:8084}")
    private String hubServiceUrl;

    public boolean existsById(String hubId) {
        if (hubId == null || hubId.isBlank()) {
            return false;
        }
        String cleanUrl = hubServiceUrl.endsWith("/") ? hubServiceUrl.substring(0, hubServiceUrl.length() - 1) : hubServiceUrl;
        String basePath = cleanUrl.endsWith("/hub") ? "" : "/hub";
        String targetUrl = cleanUrl + basePath + "/api/v1/hubs/{id}";
        try {
            return Boolean.TRUE.equals(restClient.get()
                    .uri(targetUrl, hubId.trim())
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
                        log.warn("Hub {} verification returned status {}", hubId, response.getStatusCode());
                    })
                    .toBodilessEntity()
                    .getStatusCode()
                    .is2xxSuccessful());
        } catch (Exception e) {
            log.warn("Failed to verify hub ID {} at url {}: {}", hubId, targetUrl, e.getMessage());
            return false;
        }
    }
}
