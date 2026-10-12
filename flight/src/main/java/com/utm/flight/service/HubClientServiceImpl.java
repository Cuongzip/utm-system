package com.utm.flight.service;

import com.utm.flight.config.ServiceUrlConfig;
import com.utm.flight.viewmodel.HubBriefVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class HubClientServiceImpl implements HubClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public boolean checkHubExists(String hubId) {
        return getHubById(hubId).isPresent();
    }

    @Override
    public Optional<HubBriefVm> getHubById(String hubId) {
        if (hubId == null || hubId.isBlank()) {
            return Optional.empty();
        }

        String hubUrl = serviceUrlConfig.hub();
        String basePath = hubUrl.endsWith("/hub") ? "" : "/hub";
        try {
            HubBriefVm hub = restClient.get()
                    .uri(hubUrl + basePath + "/api/v1/hubs/{id}", hubId.trim())
                    .retrieve()
                    .body(HubBriefVm.class);
            return Optional.ofNullable(hub);
        } catch (Exception e) {
            log.error("Failed to fetch hub ID {} at url {}: {}", hubId, hubUrl, e.getMessage());
            return Optional.empty();
        }
    }
}
