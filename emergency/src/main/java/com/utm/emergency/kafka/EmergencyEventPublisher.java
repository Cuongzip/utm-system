package com.utm.emergency.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.kafka.event.DroneCommandEvent;
import com.utm.commonlibrary.kafka.event.EmergencyStateEvent;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.enumeration.ResponseAction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.ZonedDateTime;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmergencyEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${utm.kafka.topic.emergency-events:utm.emergency.events}")
    private String emergencyEventsTopic = "utm.emergency.events";

    @Value("${utm.kafka.topic.drone-commands:utm.drone.commands}")
    private String droneCommandsTopic = "utm.drone.commands";

    public void publishStateEvent(String eventType, EmergencyIncident incident) {
        if (incident == null || kafkaTemplate == null) {
            return;
        }
        try {
            EmergencyStateEvent event = new EmergencyStateEvent(
                    eventType,
                    incident.getId(),
                    incident.getIncidentNumber(),
                    incident.getDroneId(),
                    incident.getFlightId(),
                    incident.getEmergencyType() != null ? incident.getEmergencyType().getValue() : null,
                    incident.getSeverity() != null ? incident.getSeverity().getValue() : null,
                    incident.getStatus() != null ? incident.getStatus().getValue() : null,
                    incident.getResponseAction() != null ? incident.getResponseAction().name() : null,
                    incident.getMessage(),
                    ZonedDateTime.now());
            String key = incident.getDroneId() != null ? incident.getDroneId() : incident.getId();
            kafkaTemplate.send(emergencyEventsTopic, key, event);
        } catch (Exception ex) {
            log.warn("Failed to publish EmergencyStateEvent [{}] for incident {}: {}",
                    eventType, incident.getId(), ex.getMessage());
        }
    }

    public void publishP0DroneCommand(
            EmergencyIncident incident,
            ResponseAction action,
            Map<String, Object> parameters) {
        if (incident == null || action == null || action == ResponseAction.NONE
                || incident.getDroneId() == null || kafkaTemplate == null) {
            return;
        }
        try {
            String paramsJson = (parameters != null && !parameters.isEmpty() && objectMapper != null)
                    ? objectMapper.writeValueAsString(parameters)
                    : "{}";
            String mappedCommandType = switch (action) {
                case RTH -> "RTL";
                case DIVERT -> "GOTO";
                case DESCEND, CLIMB -> "SET_ALTITUDE";
                case ESTOP -> "EMERGENCY_STOP";
                default -> action.name();
            };
            DroneCommandEvent cmdEvent = new DroneCommandEvent(
                    UUID.randomUUID().toString(),
                    incident.getDroneId(),
                    incident.getFlightId(),
                    mappedCommandType,
                    0,
                    paramsJson,
                    "SENT",
                    ZonedDateTime.now());
            kafkaTemplate.send(droneCommandsTopic, incident.getDroneId(), cmdEvent);
        } catch (Exception ex) {
            log.warn("Failed to publish P0 DroneCommandEvent for incident {}: {}", incident.getId(), ex.getMessage());
        }
    }
}
