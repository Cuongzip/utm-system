package com.utm.drone.kafka;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.kafka.event.DroneCommandEvent;
import com.utm.drone.model.DroneCommand;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.ZonedDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class DroneCommandEventPublisher {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${utm.kafka.topic.drone-commands:utm.drone.commands}")
    private String droneCommandsTopic;

    public void publishAfterCommit(DroneCommand command) {
        if (command == null || command.getDroneId() == null) {
            return;
        }
        String parametersJson = null;
        if (command.getParameters() != null) {
            try {
                parametersJson = OBJECT_MAPPER.writeValueAsString(command.getParameters());
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize command parameters for command {}: {}", command.getId(), e.getMessage());
            }
        }
        DroneCommandEvent event = new DroneCommandEvent(
                command.getId(),
                command.getDroneId(),
                command.getFlightId(),
                command.getCommandType() != null ? command.getCommandType().getValue() : null,
                command.getPriority(),
                parametersJson,
                command.getStatus() != null ? command.getStatus().getValue() : null,
                ZonedDateTime.now());

        Runnable sendAction = () -> {
            try {
                kafkaTemplate.send(droneCommandsTopic, event.droneId(), event);
                log.info("Published DroneCommandEvent [{}] for drone {} (flight={}) to topic {}",
                        event.commandType(), event.droneId(), event.flightId(), droneCommandsTopic);
            } catch (Exception ex) {
                log.warn("Failed to publish DroneCommandEvent [{}] for drone {}: {}",
                        event.commandType(), event.droneId(), ex.getMessage());
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sendAction.run();
                }
            });
        } else {
            sendAction.run();
        }
    }
}
