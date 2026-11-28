package com.utm.simulation.kafka;

import static com.utm.simulation.kafka.FlightLifecycleKafkaListenerConfig.SIMULATION_FLIGHT_LIFECYCLE_LISTENER_CONTAINER_FACTORY;

import com.utm.commonlibrary.kafka.cdc.BaseCdcConsumer;
import com.utm.commonlibrary.kafka.cdc.RetrySupportDql;
import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
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
public class FlightLifecycleConsumer extends BaseCdcConsumer<String, FlightLifecycleEvent> {

    private final SimulationService simulationService;

    @KafkaListener(
            id = "simulation-flight-lifecycle",
            groupId = "${spring.kafka.consumer.group-id:simulation-service}",
            topics = "${utm.kafka.topic.flight-events:utm.flight.events}",
            containerFactory = SIMULATION_FLIGHT_LIFECYCLE_LISTENER_CONTAINER_FACTORY
    )
    @RetrySupportDql(listenerContainerFactory = SIMULATION_FLIGHT_LIFECYCLE_LISTENER_CONTAINER_FACTORY)
    public void processMessage(
            @Header(value = KafkaHeaders.RECEIVED_KEY, required = false) String key,
            @Payload(required = false) FlightLifecycleEvent event,
            @Headers MessageHeaders headers
    ) {
        processMessage(key, event, headers, this::onFlightEventReceived);
    }

    public void onFlightEventReceived(String key, FlightLifecycleEvent event) {
        if (event == null || event.eventType() == null || event.flightId() == null || event.flightId().isBlank()) {
            return;
        }
        switch (event.eventType()) {
            case FlightLifecycleEvent.FLIGHT_STARTED -> simulationService.handleFlightStarted(event);
            case FlightLifecycleEvent.FLIGHT_COMPLETED,
                 FlightLifecycleEvent.FLIGHT_CANCELLED,
                 FlightLifecycleEvent.FLIGHT_EMERGENCY_LANDING ->
                    simulationService.handleFlightTerminated(event.flightId(), event.eventType());
            default -> {
            }
        }
    }
}
