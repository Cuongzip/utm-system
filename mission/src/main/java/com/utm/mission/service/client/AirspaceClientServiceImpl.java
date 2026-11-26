package com.utm.mission.service.client;

import com.utm.mission.config.ServiceUrlConfig;
import com.utm.mission.viewmodel.client.AirspaceCheckResult;
import com.utm.mission.viewmodel.client.AirspacePathCheckResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirspaceClientServiceImpl implements AirspaceClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public Optional<String> checkPointSafety(Double lat, Double lon, Double alt) {
        if (lat == null || lon == null) {
            return Optional.empty();
        }

        String airspaceUrl = serviceUrlConfig.getAirspaceUrl();
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

    @Override
    public List<String> checkPathSafety(List<double[]> latLonAltPoints) {
        if (latLonAltPoints == null || latLonAltPoints.size() < 2) {
            return List.of();
        }
        String airspaceUrl = serviceUrlConfig.getAirspaceUrl();
        try {
            List<Map<String, Object>> points = new ArrayList<>();
            for (double[] p : latLonAltPoints) {
                if (p != null && p.length >= 2) {
                    double alt = p.length >= 3 ? p[2] : 50.0;
                    points.add(Map.of("lat", p[0], "lon", p[1], "alt", alt));
                }
            }
            if (points.size() < 2) {
                return List.of();
            }

            AirspacePathCheckResult result = restClient.post()
                    .uri(airspaceUrl + "/api/v1/airspace/check-path")
                    .body(Map.of("points", points, "spacingM", 50.0))
                    .retrieve()
                    .body(AirspacePathCheckResult.class);

            if (result != null && !result.safe() && result.violations() != null) {
                return result.violations().stream()
                        .map(v -> String.format("[%s] %s: %s",
                                v.zoneType() != null ? v.zoneType() : "ZONE",
                                v.zoneName() != null ? v.zoneName() : v.zoneId(),
                                v.reason() != null ? v.reason() : "Airspace violation"))
                        .distinct()
                        .toList();
            }
        } catch (Exception e) {
            log.warn("Could not verify airspace path safety at {}: {}", airspaceUrl, e.getMessage());
        }
        return List.of();
    }
}
