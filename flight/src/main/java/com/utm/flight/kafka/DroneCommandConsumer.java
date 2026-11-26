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
        if (flight == null || flight.getStatus() != FlightStatus.ACTIVE) {
            return;
        }

        try {
            if ("GOTO".equals(cmdType) && event.parameters() != null && !event.parameters().isBlank()) {
                JsonNode params = objectMapper.readTree(event.parameters());
                String targetHubId = params.hasNonNull("targetHubId") ? params.get("targetHubId").asText() : null;
                String incidentId = params.hasNonNull("incidentId") ? params.get("incidentId").asText() : null;
                if (targetHubId != null && !targetHubId.isBlank() && incidentId != null && !incidentId.isBlank()) {
                    flightService.divertFlight(flight.getId(), targetHubId,
                            "Emergency divert command for incident " + incidentId);
                    log.info("Diverted active flight {} to hub {} due to C2 GOTO command",
                            flight.getId(), targetHubId);
                }
            } else if ("EMERGENCY_STOP".equals(cmdType)) {
                flightService.abortFlight(flight.getId(),
                        new FlightAbortVm("Emergency stop command executed for drone " + event.droneId()));
                log.warn("Aborted active flight {} due to C2 EMERGENCY_STOP command", flight.getId());
            }
        } catch (Exception ex) {
            log.warn("Failed to apply C2 command {} to flight {}: {}", cmdType, flight.getId(), ex.getMessage());
        }
    }
}
