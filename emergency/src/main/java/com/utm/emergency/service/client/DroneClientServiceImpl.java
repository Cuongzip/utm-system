package com.utm.emergency.service.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.emergency.config.ServiceUrlConfig;
import com.utm.emergency.viewmodel.client.DroneSummaryVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class DroneClientServiceImpl implements DroneClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;
    private final ObjectMapper objectMapper;

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
        String mappedCommand = mapToDroneCommandType(command);
        if (mappedCommand == null) {
            log.info("Skipping drone command dispatch for no-op action '{}' (drone: {}, incident: {})", command,
                    droneId, incidentId);
            return true;
        }

        log.warn("EMERGENCY COMMAND DISPATCH: Sending {} (mapped: {}) to drone {} (flight: {}, incident: {})",
                command, mappedCommand, droneId, flightId, incidentId);
        try {
            var url = serviceUrlConfig.getDroneUrl() + "/api/v1/drones/" + droneId + "/commands";
            String parametersJson = objectMapper.writeValueAsString(
                    Map.of("incidentId", incidentId != null ? incidentId : ""));
            restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "commandType", mappedCommand,
                            "flightId", flightId != null ? flightId : "",
                            "priority", 0,
                            "parameters", parametersJson))
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception e) {
            log.error("Failed to dispatch emergency command to drone {}: {}", droneId, e.getMessage());
            return false;
        }
    }

    static String mapToDroneCommandType(String command) {
        if (command == null || command.isBlank()) {
            return null;
        }
        return switch (command.trim().toUpperCase(Locale.ROOT)) {
            case "RTH" -> "RTL";
            case "ESTOP" -> "EMERGENCY_STOP";
            case "DIVERT" -> "GOTO";
            case "DESCEND", "CLIMB" -> "SET_ALTITUDE";
            case "LAND" -> "LAND";
            case "HOVER" -> "HOVER";
            case "NONE" -> null;
            default -> command.trim().toUpperCase(Locale.ROOT);
        };
    }
}
