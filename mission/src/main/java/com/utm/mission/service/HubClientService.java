package com.utm.mission.service;

import com.utm.mission.config.ServiceUrlConfig;
import com.utm.mission.viewmodel.HubBriefVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class HubClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    public boolean checkHubExists(String hubId) {
        if (hubId == null || hubId.isBlank()) {
            return false;
        }

        String hubUrl = getBaseHubUrl();
        try {
            return Boolean.TRUE.equals(restClient.get()
                    .uri(hubUrl + "/api/v1/hubs/{id}", hubId.trim())
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (request, response) ->
                            log.warn("Hub {} verification returned status {}", hubId, response.getStatusCode()))
                    .toBodilessEntity()
                    .getStatusCode()
                    .is2xxSuccessful());
        } catch (Exception e) {
            log.error("Failed to verify hub ID {} at {}: {}", hubId, hubUrl, e.getMessage());
            return false;
        }
    }

    public Optional<HubBriefVm> getHubById(String hubId) {
        if (hubId == null || hubId.isBlank()) {
            return Optional.empty();
        }

        String hubUrl = getBaseHubUrl();
        try {
            HubBriefVm hub = restClient.get()
                    .uri(hubUrl + "/api/v1/hubs/{id}", hubId.trim())
                    .retrieve()
                    .body(HubBriefVm.class);
            return Optional.ofNullable(hub);
        } catch (Exception e) {
            log.error("Failed to fetch hub ID {} at {}: {}", hubId, hubUrl, e.getMessage());
            return Optional.empty();
        }
    }

    public Map<String, HubBriefVm> getHubsByIds(Collection<String> hubIds) {
        if (hubIds == null || hubIds.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<String, HubBriefVm> result = new HashMap<>();
        for (String id : hubIds) {
            if (id != null && !id.isBlank() && !result.containsKey(id)) {
                getHubById(id).ifPresent(hub -> result.put(id, hub));
            }
        }
        return result;
    }

    private String getBaseHubUrl() {
        String hubUrl = serviceUrlConfig.hub();
        if (hubUrl == null || hubUrl.isBlank()) {
            hubUrl = "http://hub:8084";
        }
        return hubUrl.endsWith("/hub") ? hubUrl : hubUrl + "/hub";
    }
}
