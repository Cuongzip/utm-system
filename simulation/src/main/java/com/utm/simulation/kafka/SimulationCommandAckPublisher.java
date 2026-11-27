package com.utm.simulation.kafka;

import com.utm.commonlibrary.kafka.event.DroneCommandAckEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.ZonedDateTime;

@Component
@Slf4j
public class SimulationCommandAckPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final String commandAcksTopic;

    @Autowired
    public SimulationCommandAckPublisher(
            @Autowired(required = false) KafkaTemplate<String, Object> kafkaTemplate,
            @Value("${utm.kafka.topic.drone-command-acks:utm.drone.command.acks}") String commandAcksTopic) {
        this.kafkaTemplate = kafkaTemplate;
        this.commandAcksTopic = commandAcksTopic;
    }

    public void publishAck(
            String commandId,
            String droneId,
            String flightId,
            String commandType,
            String status,
            String message) {
        if (kafkaTemplate == null
                || commandId == null || commandId.isBlank()
                || droneId == null || droneId.isBlank()
                || status == null || status.isBlank()) {
            return;
        }
        try {
            DroneCommandAckEvent event = new DroneCommandAckEvent(
                    commandId,
                    droneId,
                    flightId,
                    commandType,
                    status,
                    0,
                    message,
                    ZonedDateTime.now());
            kafkaTemplate.send(commandAcksTopic, droneId, event);
            log.info("Published Simulation C2 ACK [status={}] for command {} (type={}, drone={})",
                    status, commandId, commandType, droneId);
        } catch (Exception ex) {
            log.warn("Failed to publish Simulation C2 ACK [status={}] for command {}: {}",
                    status, commandId, ex.getMessage());
        }
    }
}
