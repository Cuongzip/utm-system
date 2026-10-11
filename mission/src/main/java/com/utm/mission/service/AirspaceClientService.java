package com.utm.mission.service;

import com.utm.mission.config.ServiceUrlConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirspaceClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    public record AirspaceCheckResult(boolean safe, List<Map<String, Object>> violations) {
    }

    public Optional<String> checkPointSafety(Double lat, Double lon, Double alt) {
        if (lat == null || lon == null) {
            return Optional.empty();
        }

        String airspaceUrl = getBaseAirspaceUrl();
        try {
            Map<String, Object> body = Map.of(
                    "lat", lat,
                    "lon", lon,
                    "alt", alt != null ? alt : 0.0
            );

            AirspaceCheckResult result = restClient.post()
                    .uri(airspaceUrl + "/api/v1/airspace/check")
                    .body(body)
                    .retrieve()
                    .body(AirspaceCheckResult.class);

            if (result != null && !result.safe()) {
                return Optional.of("Warning: Coordinate point violates restricted airspace or no-fly zone");
            }
        } catch (Exception e) {
            log.warn("Could not verify airspace safety for point ({}, {}) at {}: {}", lat, lon, airspaceUrl, e.getMessage());
        }
        return Optional.empty();
    }

    private String getBaseAirspaceUrl() {
        String airspaceUrl = serviceUrlConfig.airspace();
        if (airspaceUrl == null || airspaceUrl.isBlank()) {
            airspaceUrl = "http://airspace:8087";
        }
        return airspaceUrl.endsWith("/airspace") ? airspaceUrl : airspaceUrl + "/airspace";
    }
}
