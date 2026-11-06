package com.utm.emergency.service.client;

import com.utm.emergency.config.ServiceUrlConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class DroneClientServiceImpl implements DroneClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public Optional<DroneSummaryVm> getDroneById(String droneId) {
        if (droneId == null || droneId.isBlank())
            return Optional.empty();
        try {
            var url = serviceUrlConfig.getDroneUrl() + "/api/v1/drones/" + droneId;
            DroneSummaryVm vm = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(DroneSummaryVm.class);
            return Optional.ofNullable(vm);
        } catch (Exception e) {
            log.warn("Failed to fetch drone from Drone Service for id {}: {}", droneId, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public boolean sendEmergencyCommand(String droneId, String command, String flightId, String incidentId) {
        log.warn("EMERGENCY COMMAND DISPATCH: Sending {} to drone {} (flight: {}, incident: {})", command, droneId, flightId, incidentId);
        try {
            var url = serviceUrlConfig.getDroneUrl() + "/api/v1/drones/" + droneId + "/commands";
            String mappedCommand = "RTH".equalsIgnoreCase(command) ? "RTL" : ("ESTOP".equalsIgnoreCase(command) ? "EMERGENCY_STOP" : command);
            restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "commandType", mappedCommand,
                            "flightId", flightId != null ? flightId : "",
                            "priority", 0,
                            "parameters", String.format("{\"incidentId\":\"%s\"}", incidentId != null ? incidentId : "")
                    ))
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception e) {
            log.error("Failed to dispatch emergency command to drone {}: {}", droneId, e.getMessage());
            return false;
        }
    }
}
