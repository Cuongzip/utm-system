package com.utm.connectivity.kafka;

import static com.utm.connectivity.kafka.ConnectivityKafkaConfig.COMMAND_FACTORY;
import static com.utm.connectivity.kafka.ConnectivityKafkaConfig.EMERGENCY_FACTORY;
import static com.utm.connectivity.kafka.ConnectivityKafkaConfig.FLIGHT_FACTORY;

import com.utm.commonlibrary.kafka.cdc.BaseCdcConsumer;
import com.utm.commonlibrary.kafka.cdc.RetrySupportDql;
import com.utm.commonlibrary.kafka.event.DroneCommandEvent;
import com.utm.commonlibrary.kafka.event.EmergencyStateEvent;
import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.connectivity.model.enumeration.TelemetryMode;
import com.utm.connectivity.service.AdaptiveRateService;
import com.utm.connectivity.service.CommandRouterService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Headers;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

@Configuration
public class ConnectivityKafkaConsumer {

    @Service
    @RequiredArgsConstructor
    public static class FlightEventsConsumer extends BaseCdcConsumer<String, FlightLifecycleEvent> {

        private final AdaptiveRateService adaptiveRateService;

        @KafkaListener(
                id = "connectivity-flight-events",
                groupId = "${spring.kafka.consumer.group-id:connectivity-service}",
                topics = "${utm.kafka.topic.flight-events:utm.flight.events}",
                containerFactory = FLIGHT_FACTORY
        )
        @RetrySupportDql(listenerContainerFactory = FLIGHT_FACTORY)
        public void onFlightEvent(
                @Header(value = KafkaHeaders.RECEIVED_KEY, required = false) String key,
                @Payload(required = false) FlightLifecycleEvent event,
                @Headers MessageHeaders headers) {
            processMessage(key, event, headers, (k, e) -> {
                if (e == null || e.droneId() == null) {
                    return;
                }
                if (FlightLifecycleEvent.FLIGHT_STARTED.equals(e.eventType())) {
                    adaptiveRateService.onDroneModeTransition(e.droneId(), TelemetryMode.NORMAL, "Flight started: " + e.flightNumber());
                } else if (FlightLifecycleEvent.FLIGHT_EMERGENCY_LANDING.equals(e.eventType())
                        || FlightLifecycleEvent.FLIGHT_DIVERTED.equals(e.eventType())) {
                    adaptiveRateService.onDroneModeTransition(e.droneId(), TelemetryMode.EMERGENCY, "Flight contingency: " + e.eventType());
                } else if (FlightLifecycleEvent.FLIGHT_COMPLETED.equals(e.eventType())
                        || FlightLifecycleEvent.FLIGHT_CANCELLED.equals(e.eventType())) {
                    adaptiveRateService.onDroneModeTransition(e.droneId(), TelemetryMode.IDLE, "Flight ended: " + e.eventType());
                }
            });
        }
    }

    @Service
    @RequiredArgsConstructor
    public static class EmergencyEventsConsumer extends BaseCdcConsumer<String, EmergencyStateEvent> {

        private final AdaptiveRateService adaptiveRateService;

        @KafkaListener(
                id = "connectivity-emergency-events",
                groupId = "${spring.kafka.consumer.group-id:connectivity-service}",
                topics = "${utm.kafka.topic.emergency-events:utm.emergency.events}",
                containerFactory = EMERGENCY_FACTORY
        )
        @RetrySupportDql(listenerContainerFactory = EMERGENCY_FACTORY)
        public void onEmergencyEvent(
                @Header(value = KafkaHeaders.RECEIVED_KEY, required = false) String key,
                @Payload(required = false) EmergencyStateEvent event,
                @Headers MessageHeaders headers) {
            processMessage(key, event, headers, (k, e) -> {
                if (e == null || e.droneId() == null) {
                    return;
                }
                if (EmergencyStateEvent.INCIDENT_CREATED.equals(e.eventType())) {
                    adaptiveRateService.onDroneModeTransition(e.droneId(), TelemetryMode.EMERGENCY,
                            "Emergency incident " + e.incidentNumber() + ": " + e.emergencyType());
                } else if (EmergencyStateEvent.INCIDENT_RESOLVED.equals(e.eventType())) {
                    adaptiveRateService.onDroneModeTransition(e.droneId(), TelemetryMode.NORMAL,
                            "Emergency incident resolved: " + e.incidentNumber());
                }
            });
        }
    }

    @Service
    @RequiredArgsConstructor
    public static class DroneCommandsConsumer extends BaseCdcConsumer<String, DroneCommandEvent> {

        private final CommandRouterService commandRouterService;

        @KafkaListener(
                id = "connectivity-command-router",
                groupId = "${spring.kafka.consumer.group-id:connectivity-service}",
                topics = "${utm.kafka.topic.drone-commands:utm.drone.commands}",
                containerFactory = COMMAND_FACTORY
        )
        @RetrySupportDql(listenerContainerFactory = COMMAND_FACTORY)
        public void onCommandEvent(
                @Header(value = KafkaHeaders.RECEIVED_KEY, required = false) String key,
                @Payload(required = false) DroneCommandEvent event,
                @Headers MessageHeaders headers) {
            processMessage(key, event, headers, (k, e) -> commandRouterService.routeCommand(e));
        }
    }
}
