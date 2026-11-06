package com.utm.airspace.service.client;

import com.utm.airspace.config.ServiceUrlConfig;
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
    public boolean existsById(String hubId) {
        if (hubId == null || hubId.isBlank()) {
            return false;
        }

        String hubBase = serviceUrlConfig.hub();
        if (hubBase == null || hubBase.isBlank()) {
            hubBase = "http://hub:8084";
        }

        String cleanUrl = hubBase.replaceAll("/+$", "");
        String basePath = cleanUrl.endsWith("/hub") ? "" : "/hub";
        String targetUrl = cleanUrl + basePath + "/api/v1/hubs/{id}";

        try {
            return Boolean.TRUE.equals(restClient.get()
                    .uri(targetUrl, hubId.trim())
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (request, response) ->
                            log.warn("Hub {} verification returned status {}", hubId, response.getStatusCode()))
                    .toBodilessEntity()
                    .getStatusCode()
                    .is2xxSuccessful());
        } catch (Exception e) {
            log.warn("Failed to verify hub ID {} at url {}: {}", hubId, targetUrl, e.getMessage());
            return false;
        }
    }
}
