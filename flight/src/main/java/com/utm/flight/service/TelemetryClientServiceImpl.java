package com.utm.flight.service;

import com.utm.flight.config.ServiceUrlConfig;
import com.utm.flight.viewmodel.TelemetryRecordVm;
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
    public Optional<TelemetryRecordVm> getLatestFlightTelemetry(String flightId) {
        if (flightId == null || flightId.isBlank()) {
            return Optional.empty();
        }

        String baseUrl = serviceUrlConfig.telemetry();
        if (baseUrl == null || baseUrl.isBlank()) {
            log.warn("Telemetry service URL is not configured");
            return Optional.empty();
        }

        String basePath = baseUrl.endsWith("/telemetry") ? "" : "/telemetry";
        String endpoint = baseUrl + basePath + "/api/v1/telemetry/flight/" + flightId.trim() + "/latest";

        try {
            TelemetryRecordVm record = restClient.get()
                    .uri(endpoint)
                    .retrieve()
                    .body(TelemetryRecordVm.class);
            return Optional.ofNullable(record);
        } catch (Exception ex) {
            log.debug("Telemetry not found or unavailable for flight '{}': {}", flightId, ex.getMessage());
            return Optional.empty();
        }
    }
}
