package com.utm.mission.kafka;

import static com.utm.mission.kafka.FlightKafkaListenerConfig.FLIGHT_LIFECYCLE_LISTENER_CONTAINER_FACTORY;

import com.utm.commonlibrary.kafka.cdc.BaseCdcConsumer;
import com.utm.commonlibrary.kafka.cdc.RetrySupportDql;
import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.mission.service.MissionExecutionService;
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

    private final MissionExecutionService missionExecutionService;

    @KafkaListener(
            id = "mission-flight-lifecycle",
            groupId = "${spring.kafka.consumer.group-id:mission-service}",
            topics = "${utm.kafka.topic.flight-events:utm.flight.events}",
            containerFactory = FLIGHT_LIFECYCLE_LISTENER_CONTAINER_FACTORY
    )
    @RetrySupportDql(listenerContainerFactory = FLIGHT_LIFECYCLE_LISTENER_CONTAINER_FACTORY)
    public void processMessage(
            @Header(value = KafkaHeaders.RECEIVED_KEY, required = false) String key,
            @Payload(required = false) FlightLifecycleEvent event,
            @Headers MessageHeaders headers
    ) {
        processMessage(key, event, headers, this::onFlightEventReceived);
    }

    public void onFlightEventReceived(String key, FlightLifecycleEvent event) {
        if (event == null) {
            return;
        }
        log.debug("Received flight lifecycle event [{}] for flight {} (mission={}, leg={})",
                event.eventType(), event.flightId(), event.missionId(), event.legIndex());
        missionExecutionService.handleFlightLifecycleEvent(event);
    }
}
