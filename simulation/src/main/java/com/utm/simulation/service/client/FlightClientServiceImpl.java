package com.utm.simulation.service.client;

import com.utm.commonlibrary.utils.ClientUrlUtils;
import com.utm.simulation.config.ServiceUrlConfig;
import com.utm.simulation.viewmodel.client.FlightDetailVm;
import com.utm.simulation.viewmodel.client.WaypointVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;
import java.util.Map;

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

        String baseUrl = ClientUrlUtils.normalizeBaseUrl(serviceUrlConfig.flight().url(), "http://flight:8086", "flight");
        String endpoint = baseUrl + "/api/v1/flights/" + flightId.trim();

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
        if (detail == null) {
            return Collections.emptyList();
        }
        if (detail.plannedRoute() != null && detail.plannedRoute().coordinates() != null) {
            double defaultAlt = detail.cruisingAltitudeM() != null ? detail.cruisingAltitudeM() : 50.0;
            return detail.plannedRoute().coordinates().stream()
                    .filter(c -> c != null && c.size() >= 2)
                    .map(c -> new WaypointVm(
                            c.get(1), // latitude
                            c.get(0), // longitude
                            c.size() > 2 && c.get(2) != null ? c.get(2) : defaultAlt
                    ))
                    .toList();
        }
        if (detail.waypoints() != null) {
            return detail.waypoints();
        }
        return Collections.emptyList();
    }

    @Override
    public boolean startFlight(String flightId) {
        if (flightId == null || flightId.isBlank() || !isFlightUrlConfigured()) {
            return false;
        }
        String endpoint = buildBaseUrl() + "/api/v1/flights/" + flightId.trim() + "/start";
        try {
            restClient.post().uri(endpoint).retrieve().toBodilessEntity();
            log.info("Synchronized flight '{}' -> ACTIVE from simulation start", flightId);
            return true;
        } catch (Exception ex) {
            log.warn("Could not start flight '{}' from simulation: {}", flightId, ex.getMessage());
            return false;
        }
    }

    @Override
    public boolean completeFlight(String flightId) {
        if (flightId == null || flightId.isBlank() || !isFlightUrlConfigured()) {
            return false;
        }
        String endpoint = buildBaseUrl() + "/api/v1/flights/" + flightId.trim() + "/complete";
        try {
            restClient.post().uri(endpoint).retrieve().toBodilessEntity();
            log.info("Synchronized flight '{}' -> COMPLETED from simulation finish", flightId);
            return true;
        } catch (Exception ex) {
            log.warn("Could not complete flight '{}' from simulation: {}", flightId, ex.getMessage());
            return false;
        }
    }

    @Override
    public boolean abortFlight(String flightId, String reason) {
        if (flightId == null || flightId.isBlank() || !isFlightUrlConfigured()) {
            return false;
        }
        String endpoint = buildBaseUrl() + "/api/v1/flights/" + flightId.trim() + "/abort";
        try {
            restClient.post()
                    .uri(endpoint)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("reason", reason != null && !reason.isBlank() ? reason : "Simulation aborted"))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Synchronized flight '{}' -> ABORTED from simulation ({})", flightId, reason);
            return true;
        } catch (Exception ex) {
            log.warn("Could not abort flight '{}' from simulation: {}", flightId, ex.getMessage());
            return false;
        }
    }

    private boolean isFlightUrlConfigured() {
        return serviceUrlConfig.flight() != null
                && serviceUrlConfig.flight().url() != null
                && !serviceUrlConfig.flight().url().isBlank();
    }

    private String buildBaseUrl() {
        return ClientUrlUtils.normalizeBaseUrl(serviceUrlConfig.flight().url(), "http://flight:8086", "flight");
    }
}
