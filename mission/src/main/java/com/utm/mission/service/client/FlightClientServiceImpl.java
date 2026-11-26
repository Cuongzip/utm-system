package com.utm.mission.service.client;

import com.utm.mission.config.ServiceUrlConfig;
import com.utm.mission.viewmodel.client.FlightBriefVm;
import com.utm.mission.viewmodel.client.FlightCreateRequestVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class FlightClientServiceImpl implements FlightClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public Optional<FlightBriefVm> createFlight(FlightCreateRequestVm requestVm) {
        String flightUrl = serviceUrlConfig.getFlightUrl();
        try {
            FlightBriefVm createdFlight = restClient.post()
                    .uri(flightUrl + "/api/v1/flights")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestVm)
                    .retrieve()
                    .body(FlightBriefVm.class);

            return Optional.ofNullable(createdFlight);
        } catch (RestClientResponseException e) {
            log.error("Flight service returned HTTP {} when creating flight: {}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            return Optional.empty();
        } catch (Exception e) {
            log.error("Failed to call Flight service to create flight plan at {}: {}", flightUrl, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public boolean abortFlight(String flightId, String reason) {
        if (flightId == null || flightId.isBlank()) {
            return false;
        }
        String flightUrl = serviceUrlConfig.getFlightUrl();
        try {
            restClient.post()
                    .uri(flightUrl + "/api/v1/flights/{id}/abort", flightId.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("reason", reason != null ? reason : "Mission execution aborted"))
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception e) {
            log.warn("Failed to abort flight {} at {}: {}", flightId, flightUrl, e.getMessage());
            return false;
        }
    }

    @Override
    public boolean reassignFlightDrone(String flightId, String newDroneId) {
        if (flightId == null || flightId.isBlank() || newDroneId == null || newDroneId.isBlank()) {
            return false;
        }
        String flightUrl = serviceUrlConfig.getFlightUrl();
        try {
            restClient.put()
                    .uri(flightUrl + "/api/v1/flights/{id}", flightId.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("droneId", newDroneId.trim()))
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception e) {
            log.warn("Failed to reassign drone {} on flight {}: {}", newDroneId, flightId, e.getMessage());
            return false;
        }
    }

    @Override
    public boolean updateFlightLegPlan(String flightId, Map<String, Object> updates) {
        if (flightId == null || flightId.isBlank() || updates == null || updates.isEmpty()) {
            return false;
        }
        String flightUrl = serviceUrlConfig.getFlightUrl();
        try {
            restClient.put()
                    .uri(flightUrl + "/api/v1/flights/{id}", flightId.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(updates)
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception e) {
            log.warn("Failed to update flight {} leg plan fields {}: {}", flightId, updates.keySet(), e.getMessage());
            return false;
        }
    }
}
