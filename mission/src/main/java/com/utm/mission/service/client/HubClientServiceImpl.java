package com.utm.mission.service.client;

import com.utm.mission.config.ServiceUrlConfig;
import com.utm.mission.viewmodel.client.HubBriefVm;
import com.utm.mission.viewmodel.client.HubListClientVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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

        String hubUrl = serviceUrlConfig.getHubUrl();
        try {
            return Boolean.TRUE.equals(restClient.get()
                    .uri(hubUrl + "/api/v1/hubs/{id}", hubId.trim())
                    .retrieve()
                    .toBodilessEntity()
                    .getStatusCode()
                    .is2xxSuccessful());
        } catch (RestClientResponseException e) {
            log.warn("Hub {} verification returned status {}", hubId, e.getStatusCode());
            return false;
        } catch (Exception e) {
            log.error("Failed to verify hub ID {} at {}: {}", hubId, hubUrl, e.getMessage());
            return false;
        }
    }

    @Override
    public Optional<HubBriefVm> getHubById(String hubId) {
        if (hubId == null || hubId.isBlank()) {
            return Optional.empty();
        }

        String hubUrl = serviceUrlConfig.getHubUrl();
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

    @Override
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

    @Override
    public List<HubBriefVm> getActiveHubs() {
        String hubUrl = serviceUrlConfig.getHubUrl();
        try {
            HubListClientVm list = restClient.get()
                    .uri(hubUrl + "/api/v1/hubs?status=ACTIVE&limit=0")
                    .retrieve()
                    .body(HubListClientVm.class);
            return list != null && list.items() != null ? list.items() : Collections.emptyList();
        } catch (Exception e) {
            log.warn("Failed to list active hubs from {}: {}", hubUrl, e.getMessage());
            return Collections.emptyList();
        }
    }
}
