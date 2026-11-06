package com.utm.flight.service.client;

import com.utm.flight.config.ServiceUrlConfig;
import com.utm.flight.model.Flight;
import com.utm.flight.viewmodel.client.EmergencyIncidentPostVm;
import com.utm.flight.viewmodel.client.TelemetryBriefVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmergencyClientServiceImpl implements EmergencyClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public void reportIncident(Flight flight, String emergencyType, String severity,
                               String message, TelemetryBriefVm telemetry, Object detectionData) {
        if (flight == null || emergencyType == null || emergencyType.isBlank()) {
            return;
        }

        Double lat = telemetry != null ? telemetry.latitude() : null;
        Double lon = telemetry != null ? telemetry.longitude() : null;
        Double alt = telemetry != null ? telemetry.altitude() : null;

        EmergencyIncidentPostVm postVm = new EmergencyIncidentPostVm(
                flight.getDroneId() != null ? flight.getDroneId() : "unknown",
                flight.getId(),
                emergencyType,
                severity != null ? severity : "CRITICAL",
                message != null ? message : "Emergency incident reported by flight conformance watchdog",
                detectionData,
                lat,
                lon,
                alt
        );

        String endpoint = serviceUrlConfig.getEmergencyUrl() + "/api/v1/emergency/incidents";

        try {
            restClient.post()
                    .uri(endpoint)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(postVm)
                    .retrieve()
                    .toBodilessEntity();
            log.warn("Successfully reported emergency incident [{}-{}] for flight '{}' (Flight Number: {}) to emergency service",
                    emergencyType, severity, flight.getId(), flight.getFlightNumber());
        } catch (Exception ex) {
            log.warn("Failed to report emergency incident for flight '{}' to emergency service: {}",
                    flight.getId(), ex.getMessage());
        }
    }
}
