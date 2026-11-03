package com.utm.emergency.service.client;

import com.utm.emergency.config.ServiceUrlConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class FlightClientServiceImpl implements FlightClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public Optional<FlightSummaryVm> getFlightById(String flightId) {
        if (flightId == null || flightId.isBlank()) return Optional.empty();
        try {
            var url = (serviceUrlConfig.flight() != null ? serviceUrlConfig.flight() : "http://flight:8086") + "/flight/api/v1/flights/" + flightId;
            FlightSummaryVm vm = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(FlightSummaryVm.class);
            return Optional.ofNullable(vm);
        } catch (Exception e) {
            log.warn("Failed to fetch flight details from Flight Service for id {}: {}", flightId, e.getMessage());
            return Optional.empty();
        }
    }
}