package com.utm.hub.service.client;

import com.utm.hub.config.ServiceUrlConfig;
import com.utm.hub.viewmodel.client.FlightListClientVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@RequiredArgsConstructor
@Slf4j
public class FlightClientServiceImpl implements FlightClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    private static final java.util.List<String> ACTIVE_FLIGHT_STATUSES = java.util.List.of(
            "active", "diverted", "emergency_landing");

    @Override
    public boolean hasActiveFlightsAtHub(String hubId) {
        if (hubId == null || hubId.isBlank()) {
            return false;
        }

        String flightUrl = serviceUrlConfig.getFlightUrl();
        String trimmedHubId = hubId.trim();
        for (String status : ACTIVE_FLIGHT_STATUSES) {
            try {
                FlightListClientVm response = restClient.get()
                        .uri(flightUrl + "/api/v1/flights?status={status}&limit=0", status)
                        .retrieve()
                        .body(FlightListClientVm.class);

                if (response != null && response.items() != null) {
                    boolean found = response.items().stream().anyMatch(flight ->
                            trimmedHubId.equals(flight.departureHubId()) || trimmedHubId.equals(flight.arrivalHubId())
                    );
                    if (found) {
                        return true;
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to check {} flights for hub {} at {}: {}", status, hubId, flightUrl, e.getMessage());
            }
        }
        return false;
    }
}
