package com.utm.flight.service;

import com.utm.flight.config.ServiceUrlConfig;
import com.utm.flight.model.Flight;
import com.utm.flight.model.FlightConformance;
import com.utm.flight.model.enumeration.ConformanceStatus;
import com.utm.flight.viewmodel.ConflictPostVm;
import com.utm.flight.viewmodel.TelemetryBriefVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

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

        String baseUrl = serviceUrlConfig.conflict();
        if (baseUrl == null || baseUrl.isBlank()) {
            log.warn("Conflict service URL is not configured; skipping conflict reporting for flight '{}'", flight.getId());
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

        String basePath = baseUrl.endsWith("/conflict") ? "" : "/conflict";
        String endpoint = baseUrl + basePath + "/api/v1/conflicts";

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
}
