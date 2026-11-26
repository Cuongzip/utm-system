package com.utm.connectivity.service.client;

import com.utm.connectivity.config.ServiceUrlConfig;
import com.utm.connectivity.viewmodel.client.HubBriefVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
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
    public Optional<HubBriefVm> getHubById(String hubId) {
        if (hubId == null || hubId.isBlank()) {
            return Optional.empty();
        }
        try {
            HubBriefVm hub = restClient.get()
                    .uri(serviceUrlConfig.getHubUrl() + "/api/v1/hubs/{id}", hubId.trim())
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    })
                    .body(HubBriefVm.class);
            return (hub != null && hub.id() != null) ? Optional.of(hub) : Optional.empty();
        } catch (Exception ex) {
            log.warn("Failed to retrieve hub {}: {}", hubId, ex.getMessage());
            return Optional.empty();
        }
    }
}
