package com.utm.flight.kafka;

import static com.utm.flight.kafka.DroneCommandKafkaListenerConfig.DRONE_COMMAND_LISTENER_CONTAINER_FACTORY;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.kafka.cdc.BaseCdcConsumer;
import com.utm.commonlibrary.kafka.cdc.RetrySupportDql;
import com.utm.commonlibrary.kafka.event.DroneCommandEvent;
import com.utm.flight.model.Flight;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.repository.FlightRepository;
import com.utm.flight.service.FlightService;
import com.utm.flight.viewmodel.flight.FlightAbortVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Headers;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class DroneCommandConsumer extends BaseCdcConsumer<String, DroneCommandEvent> {

    private final FlightRepository flightRepository;
    private final FlightService flightService;
    private final ObjectMapper objectMapper;

    @KafkaListener(
            id = "flight-drone-command",
            groupId = "${spring.kafka.consumer.group-id:flight-service}",
            topics = "${utm.kafka.topic.drone-commands:utm.drone.commands}",
            containerFactory = DRONE_COMMAND_LISTENER_CONTAINER_FACTORY
    )
    @RetrySupportDql(listenerContainerFactory = DRONE_COMMAND_LISTENER_CONTAINER_FACTORY)
    public void processMessage(
            @Header(value = KafkaHeaders.RECEIVED_KEY, required = false) String key,
            @Payload(required = false) DroneCommandEvent event,
            @Headers MessageHeaders headers
    ) {
        processMessage(key, event, headers, this::onCommandReceived);
    }

    public void onCommandReceived(String key, DroneCommandEvent event) {
        if (event == null || event.flightId() == null || event.flightId().isBlank()
                || event.commandType() == null || event.commandType().isBlank()) {
            return;
        }
        String cmdType = event.commandType().trim().toUpperCase(Locale.ROOT);
        Flight flight = flightRepository.findById(event.flightId()).orElse(null);
        if (flight == null) {
            return;
        }

        try {
            if ("TAKEOFF".equals(cmdType) && flight.getStatus() == FlightStatus.AUTHORIZED) {
                flightService.startFlight(flight.getId());
                log.info("Started authorized flight {} on C2 TAKEOFF command", flight.getId());
                return;
            }
            if (flight.getStatus() != FlightStatus.ACTIVE && flight.getStatus() != FlightStatus.DIVERTED) {
                return;
            }
            if ("RTL".equals(cmdType)) {
                flightService.returnToHome(flight.getId(), "C2 RTH command issued for drone " + event.droneId());
                log.info("Updated flight {} corridor to RTH toward departure hub", flight.getId());
            } else if ("RESUME".equals(cmdType) && flight.getStatus() == FlightStatus.DIVERTED) {
                flightService.resumePlannedRoute(flight.getId());
                log.info("Resumed active flight corridor for flight {}", flight.getId());
            } else if ("GOTO".equals(cmdType) && event.parameters() != null && !event.parameters().isBlank()) {
                JsonNode params = objectMapper.readTree(event.parameters());
                String targetHubId = params.hasNonNull("targetHubId") ? params.get("targetHubId").asText() : null;
                String incidentId = params.hasNonNull("incidentId") ? params.get("incidentId").asText() : null;
                if (targetHubId != null && !targetHubId.isBlank()) {
                    String divertReason = (incidentId != null && !incidentId.isBlank())
                            ? "Emergency divert command for incident " + incidentId
                            : "Operator GOTO hub diversion command";
                    flightService.divertFlight(flight.getId(), targetHubId, divertReason);
                    log.info("Diverted flight {} to hub {} due to C2 GOTO command",
                            flight.getId(), targetHubId);
                } else {
                    Double targetLat = extractDouble(params, "latitude", "lat");
                    Double targetLon = extractDouble(params, "longitude", "lon", "lng");
                    Double targetAlt = extractDouble(params, "altitude", "alt", "targetAltitude");
                    if (targetLat != null && targetLon != null) {
                        flightService.tacticalGoto(flight.getId(), targetLat, targetLon, targetAlt);
                        log.info("Updated flight {} corridor to tactical GOTO [{}, {}]",
                                flight.getId(), targetLat, targetLon);
                    }
                }
            } else if ("SET_ALTITUDE".equals(cmdType) && event.parameters() != null && !event.parameters().isBlank()) {
                log.debug("Observed tactical C2 SET_ALTITUDE for flight {}; preserving immutable ATC plannedRoute",
                        flight.getId());
            } else if ("EMERGENCY_STOP".equals(cmdType)) {
                flightService.abortFlight(flight.getId(),
                        new FlightAbortVm("Emergency stop command executed for drone " + event.droneId()));
                log.warn("Aborted active flight {} due to C2 EMERGENCY_STOP command", flight.getId());
            }
        } catch (Exception ex) {
            log.warn("Failed to apply C2 command {} to flight {}: {}", cmdType, flight.getId(), ex.getMessage());
        }
    }

    private Double extractDouble(JsonNode node, String... fieldNames) {
        if (node == null || !node.isObject()) {
            return null;
        }
        for (String field : fieldNames) {
            JsonNode val = node.get(field);
            if (val != null && val.isNumber()) {
                return val.asDouble();
            }
            if (val != null && val.isTextual()) {
                try {
                    return Double.parseDouble(val.asText().trim());
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return null;
    }
}
