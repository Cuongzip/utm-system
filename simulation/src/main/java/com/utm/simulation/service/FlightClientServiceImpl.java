package com.utm.simulation.service;

import com.utm.simulation.config.ServiceUrlConfig;
import com.utm.simulation.viewmodel.FlightDetailVm;
import com.utm.simulation.viewmodel.WaypointVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FlightClientServiceImpl implements FlightClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public FlightDetailVm getFlightDetail(String flightId) {
        if (flightId == null || flightId.isBlank()) {
            return null;
        }

        if (serviceUrlConfig.flight() == null || serviceUrlConfig.flight().url() == null
                || serviceUrlConfig.flight().url().isBlank()) {
            log.warn("Flight service URL is not configured");
            return null;
        }

        String baseUrl = serviceUrlConfig.flight().url();
        String basePath = baseUrl.endsWith("/flight") ? "" : "/flight";
        String endpoint = baseUrl + basePath + "/api/v1/flights/" + flightId.trim();

        try {
            return restClient.get()
                    .uri(endpoint)
                    .retrieve()
                    .body(FlightDetailVm.class);
        } catch (Exception ex) {
            log.warn("Could not retrieve flight details for flight ID '{}' from flight service: {}", flightId,
                    ex.getMessage());
            return null;
        }
    }

    @Override
    public List<WaypointVm> getFlightWaypoints(String flightId) {
        FlightDetailVm detail = getFlightDetail(flightId);
        if (detail != null && detail.waypoints() != null) {
            return detail.waypoints();
        }
        return Collections.emptyList();
    }
}

