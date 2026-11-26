package com.utm.flight.service.client;

import com.utm.flight.config.ServiceUrlConfig;
import com.utm.flight.viewmodel.client.AirspacePathCheckResultVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirspaceClientServiceImpl implements AirspaceClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public AirspacePathCheckResultVm checkPath(List<List<Double>> routeCoordinates, Double defaultAltitude) {
        if (routeCoordinates == null || routeCoordinates.size() < 2) {
            return new AirspacePathCheckResultVm(true, List.of());
        }

        double fallbackAlt = defaultAltitude != null ? defaultAltitude : 50.0;
        List<Map<String, Object>> points = new ArrayList<>();
        for (List<Double> coord : routeCoordinates) {
            if (coord != null && coord.size() >= 2 && coord.get(0) != null && coord.get(1) != null) {
                double lon = coord.get(0);
                double lat = coord.get(1);
                double alt = coord.size() >= 3 && coord.get(2) != null ? coord.get(2) : fallbackAlt;
                points.add(Map.of("lat", lat, "lon", lon, "alt", alt));
            }
        }
        if (points.size() < 2) {
            return new AirspacePathCheckResultVm(true, List.of());
        }

        String endpoint = serviceUrlConfig.getAirspaceUrl() + "/api/v1/airspace/check-path";
        try {
            AirspacePathCheckResultVm result = restClient.post()
                    .uri(endpoint)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("points", points, "spacingM", 50.0))
                    .retrieve()
                    .body(AirspacePathCheckResultVm.class);
            return result != null ? result : new AirspacePathCheckResultVm(true, List.of());
        } catch (Exception ex) {
            log.warn("Airspace path check unavailable at {}: {}", endpoint, ex.getMessage());
            return null;
        }
    }
}
