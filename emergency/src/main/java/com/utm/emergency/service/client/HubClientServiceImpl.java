package com.utm.emergency.service.client;

import com.utm.emergency.config.ServiceUrlConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class HubClientServiceImpl implements HubClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public Optional<HubLocationVm> getHubById(String hubId) {
        if (hubId == null || hubId.isBlank())
            return Optional.empty();
        try {
            var url = (serviceUrlConfig.hub() != null ? serviceUrlConfig.hub() : "http://hub:8084")
                    + "/hub/api/v1/hubs/" + hubId;
            HubLocationVm vm = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(HubLocationVm.class);
            return Optional.ofNullable(vm);
        } catch (Exception e) {
            log.warn("Failed to fetch hub details from Hub Service for id {}: {}", hubId, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public List<HubLocationVm> getActiveHubs() {
        try {
            var url = (serviceUrlConfig.hub() != null ? serviceUrlConfig.hub() : "http://hub:8084")
                    + "/hub/api/v1/hubs?status=active";
            List<HubLocationVm> list = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {
                    });
            return list != null ? list : Collections.emptyList();
        } catch (Exception e) {
            log.warn("Failed to fetch active hubs from Hub Service: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}