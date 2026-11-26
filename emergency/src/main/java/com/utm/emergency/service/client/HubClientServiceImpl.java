package com.utm.emergency.service.client;

import com.utm.emergency.config.ServiceUrlConfig;
import com.utm.emergency.viewmodel.client.HubListClientVm;
import com.utm.emergency.viewmodel.client.HubLocationVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
        if (hubId == null || hubId.isBlank()) {
            return Optional.empty();
        }
        try {
            var url = serviceUrlConfig.getHubUrl() + "/api/v1/hubs/" + hubId.trim();
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
            var url = serviceUrlConfig.getHubUrl() + "/api/v1/hubs?status=ACTIVE&limit=0";
            HubListClientVm response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(HubListClientVm.class);
            return response != null && response.items() != null ? response.items() : Collections.emptyList();
        } catch (Exception e) {
            log.warn("Failed to fetch active hubs from Hub Service: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
