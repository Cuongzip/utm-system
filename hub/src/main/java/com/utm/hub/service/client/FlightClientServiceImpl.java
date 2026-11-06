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

    @Override
    public boolean hasActiveFlightsAtHub(String hubId) {
        if (hubId == null || hubId.isBlank()) {
            return false;
        }

        String flightUrl = serviceUrlConfig.getFlightUrl();
        try {
            FlightListClientVm response = restClient.get()
                    .uri(flightUrl + "/api/v1/flights?status=active&limit=100")
                    .retrieve()
                    .body(FlightListClientVm.class);

            if (response != null && response.items() != null) {
                String trimmedHubId = hubId.trim();
                return response.items().stream().anyMatch(flight ->
                        trimmedHubId.equals(flight.departureHubId()) || trimmedHubId.equals(flight.arrivalHubId())
                );
            }
            return false;
        } catch (Exception e) {
            log.warn("Failed to check active flights for hub {} at {}: {}", hubId, flightUrl, e.getMessage());
            return false;
        }
    }
}
