package com.utm.emergency.service.client;

import com.utm.emergency.config.ServiceUrlConfig;
import com.utm.emergency.viewmodel.client.TelemetryStreamVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelemetryClientServiceImpl implements TelemetryClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public Optional<TelemetryStreamVm> getLatestByDroneId(String droneId) {
        if (droneId == null || droneId.isBlank()) {
            return Optional.empty();
        }
        try {
            var url = serviceUrlConfig.getTelemetryUrl() + "/api/v1/telemetry/drone/" + droneId.trim() + "/latest";
            TelemetryStreamVm vm = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(TelemetryStreamVm.class);
            return Optional.ofNullable(vm);
        } catch (Exception e) {
            log.debug("Unable to fetch latest telemetry for drone {}: {}", droneId, e.getMessage());
            return Optional.empty();
        }
    }
}
