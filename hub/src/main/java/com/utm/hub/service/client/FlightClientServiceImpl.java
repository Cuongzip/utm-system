package com.utm.hub.service.client;

import com.utm.hub.config.ServiceUrlConfig;
import com.utm.hub.viewmodel.client.FlightListClientVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class FlightClientServiceImpl implements FlightClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    private static final List<String> ACTIVE_FLIGHT_STATUSES = List.of(
            "authorized", "active", "diverted", "emergency_landing");

    @Override
    public boolean hasActiveFlightsAtHub(String hubId) {
        return countActiveFlightsAtHub(hubId) > 0;
    }

    @Override
    public int countActiveFlightsAtHub(String hubId) {
        if (hubId == null || hubId.isBlank()) {
            return 0;
        }

        String flightUrl = serviceUrlConfig.getFlightUrl();
        String trimmedHubId = hubId.trim();
        Set<String> flightIds = new HashSet<>();
        for (String status : ACTIVE_FLIGHT_STATUSES) {
            try {
                FlightListClientVm response = restClient.get()
                        .uri(flightUrl + "/api/v1/flights?status={status}&limit=0", status)
                        .retrieve()
                        .body(FlightListClientVm.class);

                if (response != null && response.items() != null) {
                    response.items().stream()
                            .filter(flight -> trimmedHubId.equals(flight.departureHubId())
                                    || trimmedHubId.equals(flight.arrivalHubId()))
                            .forEach(flight -> flightIds.add(flight.id()));
                }
            } catch (Exception e) {
                log.warn("Failed to check {} flights for hub {} at {}: {}", status, hubId, flightUrl, e.getMessage());
            }
        }
        return flightIds.size();
    }
}
