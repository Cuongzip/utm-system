package com.utm.flight.service.client;

import com.utm.flight.config.ServiceUrlConfig;
import com.utm.flight.model.Flight;
import com.utm.flight.model.FlightConformance;
import com.utm.flight.model.enumeration.ConformanceStatus;
import com.utm.flight.viewmodel.client.ConflictPostVm;
import com.utm.flight.viewmodel.client.TelemetryBriefVm;
import com.utm.flight.viewmodel.client.TrajectoryConflictCheckResultClientVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConflictClientServiceImpl implements ConflictClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public void reportConformanceConflict(Flight flight, FlightConformance conformance,
                                          TelemetryBriefVm telemetry, String message) {
        if (flight == null || conformance == null) {
            return;
        }

        String severity = conformance.getStatus() == ConformanceStatus.CONTINGENT ? "emergency" : "critical";
        String conflictType = "geofence_violation";

        Double lat = telemetry != null ? telemetry.latitude() : null;
        Double lon = telemetry != null ? telemetry.longitude() : null;
        Double alt = telemetry != null ? telemetry.altitude() : null;

        Double separationDist = conformance.getCrossTrackErrorM();
        Double vertSeparation = conformance.getVerticalErrorM();

        ConflictPostVm postVm = new ConflictPostVm(
                flight.getId(),
                null,
                conflictType,
                severity,
                flight.getDepartureHubId(),
                lat,
                lon,
                alt,
                separationDist,
                vertSeparation,
                0,
                message
        );

        String endpoint = serviceUrlConfig.getConflictUrl() + "/api/v1/conflicts";

        try {
            restClient.post()
                    .uri(endpoint)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(postVm)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Reported conformance conflict [severity={}] for flight '{}' (Flight Number: {}) to conflict service",
                    severity, flight.getId(), flight.getFlightNumber());
        } catch (Exception ex) {
            log.warn("Failed to report conformance conflict for flight '{}' to conflict service: {}",
                    flight.getId(), ex.getMessage());
        }
    }

    @Override
    public Optional<TrajectoryConflictCheckResultClientVm> checkTrajectory4D(Flight flight) {
        if (flight == null || flight.getPlannedRoute() == null
                || flight.getPlannedRoute().coordinates() == null
                || flight.getPlannedRoute().coordinates().size() < 2) {
            return Optional.empty();
        }
        List<Map<String, Object>> points = new ArrayList<>();
        for (List<Double> coord : flight.getPlannedRoute().coordinates()) {
            if (coord != null && coord.size() >= 2) {
                Map<String, Object> pt = new LinkedHashMap<>();
                pt.put("lon", coord.get(0));
                pt.put("lat", coord.get(1));
                pt.put("alt", coord.size() >= 3 && coord.get(2) != null
                        ? coord.get(2)
                        : (flight.getCruisingAltitudeM() != null ? flight.getCruisingAltitudeM() : 50.0));
                points.add(pt);
            }
        }
        if (points.size() < 2) {
            return Optional.empty();
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("waypoints", points);
        payload.put("scheduledDeparture", flight.getScheduledDeparture());
        payload.put("scheduledArrival", flight.getScheduledArrival());
        payload.put("speedMps", 15.0);
        payload.put("excludeFlightId", flight.getId());

        String endpoint = serviceUrlConfig.getConflictUrl() + "/api/v1/conflicts/check-trajectory";
        try {
            TrajectoryConflictCheckResultClientVm result = restClient.post()
                    .uri(endpoint)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(TrajectoryConflictCheckResultClientVm.class);
            return Optional.ofNullable(result);
        } catch (Exception ex) {
            log.warn("4D trajectory conflict check skipped for flight '{}': {}", flight.getId(), ex.getMessage());
            return Optional.empty();
        }
    }
}


