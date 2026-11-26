package com.utm.flight.kafka;

import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.flight.model.Flight;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.time.ZonedDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class FlightEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${utm.kafka.topic.flight-events:utm.flight.events}")
    private String flightEventsTopic = "utm.flight.events";

    public void publish(
            String eventType,
            Flight flight,
            String actualLandingHubId,
            Integer waypointIndex,
            String reason
    ) {
        publish(eventType, flight, actualLandingHubId, waypointIndex, reason, null);
    }

    public void publish(
            String eventType,
            Flight flight,
            String actualLandingHubId,
            Integer waypointIndex,
            String reason,
            Boolean waitForConfirmation
    ) {
        if (flight == null) {
            return;
        }

        Double durationHours = null;
        if (flight.getActualDeparture() != null && flight.getActualArrival() != null) {
            long seconds = Math.max(0L, Duration.between(flight.getActualDeparture(), flight.getActualArrival()).getSeconds());
            durationHours = Math.round((seconds / 3600.0) * 1000.0) / 1000.0;
        }

        FlightLifecycleEvent event = new FlightLifecycleEvent(
                eventType,
                flight.getId(),
                flight.getFlightNumber(),
                flight.getMissionId(),
                flight.getExecutionId(),
                flight.getLegIndex(),
                flight.getTotalLegs(),
                flight.getDroneId(),
                flight.getDepartureHubId(),
                flight.getArrivalHubId(),
                actualLandingHubId != null ? actualLandingHubId : flight.getArrivalHubId(),
                flight.getStatus() != null ? flight.getStatus().getValue() : null,
                waypointIndex,
                durationHours,
                reason,
                ZonedDateTime.now(),
                flight.getEndingBatteryPct(),
                flight.getArrivalStopoverType(),
                waitForConfirmation
        );

        String key = flight.getExecutionId() != null && !flight.getExecutionId().isBlank()
                ? flight.getExecutionId()
                : flight.getId();

        Runnable sendTask = () -> {
            try {
                kafkaTemplate.send(flightEventsTopic, key, event);
                log.debug("Published {} for flight {} to topic {}", eventType, flight.getId(), flightEventsTopic);
            } catch (Exception ex) {
                log.error("Failed to publish {} for flight {} to Kafka: {}", eventType, flight.getId(), ex.getMessage());
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sendTask.run();
                }
            });
        } else {
            sendTask.run();
        }
    }
}
