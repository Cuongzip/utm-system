package com.utm.simulation.kafka;

import static com.utm.simulation.kafka.DroneCommandKafkaListenerConfig.DRONE_COMMAND_LISTENER_CONTAINER_FACTORY;

import com.utm.commonlibrary.kafka.cdc.BaseCdcConsumer;
import com.utm.commonlibrary.kafka.cdc.RetrySupportDql;
import com.utm.commonlibrary.kafka.event.DroneCommandEvent;
import com.utm.simulation.service.SimulationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Headers;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DroneCommandConsumer extends BaseCdcConsumer<String, DroneCommandEvent> {

    private final SimulationService simulationService;

    @KafkaListener(
            id = "simulation-drone-command",
            groupId = "${spring.kafka.consumer.group-id:simulation-service}",
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
        if (event == null) {
            return;
        }
        log.info("Simulation received C2 command [{}] for drone {} (flight={})",
                event.commandType(), event.droneId(), event.flightId());
        simulationService.handleDroneCommand(event);
    }
}
