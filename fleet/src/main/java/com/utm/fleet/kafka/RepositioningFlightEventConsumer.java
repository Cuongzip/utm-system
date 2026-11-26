package com.utm.fleet.kafka;

import static com.utm.fleet.kafka.FlightKafkaListenerConfig.FLEET_FLIGHT_LIFECYCLE_CONTAINER_FACTORY;

import com.utm.commonlibrary.kafka.cdc.BaseCdcConsumer;
import com.utm.commonlibrary.kafka.cdc.RetrySupportDql;
import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.fleet.service.FleetService;
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
public class RepositioningFlightEventConsumer extends BaseCdcConsumer<String, FlightLifecycleEvent> {

    private final FleetService fleetService;

    @KafkaListener(
            id = "fleet-repositioning-flight-lifecycle",
            groupId = "${spring.kafka.consumer.group-id:fleet-service-group}",
            topics = "${utm.kafka.topic.flight-events:utm.flight.events}",
            containerFactory = FLEET_FLIGHT_LIFECYCLE_CONTAINER_FACTORY
    )
    @RetrySupportDql(listenerContainerFactory = FLEET_FLIGHT_LIFECYCLE_CONTAINER_FACTORY)
    public void processMessage(
            @Header(value = KafkaHeaders.RECEIVED_KEY, required = false) String key,
            @Payload(required = false) FlightLifecycleEvent event,
            @Headers MessageHeaders headers
    ) {
        processMessage(key, event, headers, this::onFlightEvent);
    }

    public void onFlightEvent(String key, FlightLifecycleEvent event) {
        if (event != null) {
            fleetService.handleFlightLifecycleEvent(event);
        }
    }
}
