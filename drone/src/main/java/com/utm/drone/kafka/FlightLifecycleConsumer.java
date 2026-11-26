package com.utm.drone.kafka;

import static com.utm.drone.kafka.FlightKafkaListenerConfig.FLIGHT_LIFECYCLE_LISTENER_CONTAINER_FACTORY;

import com.utm.commonlibrary.kafka.cdc.BaseCdcConsumer;
import com.utm.commonlibrary.kafka.cdc.RetrySupportDql;
import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.drone.model.enumeration.DroneStatus;
import com.utm.drone.repository.DroneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Headers;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class FlightLifecycleConsumer extends BaseCdcConsumer<String, FlightLifecycleEvent> {

    private final DroneRepository droneRepository;

    @KafkaListener(
            id = "drone-flight-lifecycle",
            groupId = "${spring.kafka.consumer.group-id:drone-service}",
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

    @Transactional
    public void onFlightEventReceived(String key, FlightLifecycleEvent event) {
        if (event == null || event.droneId() == null || event.droneId().isBlank() || event.eventType() == null) {
            return;
        }

        droneRepository.findById(event.droneId()).ifPresent(drone -> {
            switch (event.eventType()) {
                case FlightLifecycleEvent.FLIGHT_STARTED -> {
                    drone.setStatus(DroneStatus.IN_FLIGHT);
                    drone.setCurrentHubId(null);
                    droneRepository.save(drone);
                    log.info("Synced drone {} status -> IN_FLIGHT (cleared currentHubId) for flight {}",
                            drone.getId(), event.flightId());
                }
                case FlightLifecycleEvent.FLIGHT_COMPLETED -> {
                    String landingHub = event.actualLandingHubId() != null && !event.actualLandingHubId().isBlank()
                            ? event.actualLandingHubId()
                            : event.arrivalHubId();
                    if (landingHub != null && !landingHub.isBlank()) {
                        drone.setCurrentHubId(landingHub);
                    }
                    int prevFlights = drone.getTotalFlights() != null ? drone.getTotalFlights() : 0;
                    drone.setTotalFlights(prevFlights + 1);
                    if (event.durationHours() != null && event.durationHours() > 0.0) {
                        double prevHours = drone.getTotalFlightHours() != null ? drone.getTotalFlightHours() : 0.0;
                        drone.setTotalFlightHours(Math.round((prevHours + event.durationHours()) * 100.0) / 100.0);
                    }
                    if (event.endingBatteryPct() != null) {
                        double clamped = Math.max(0.0, Math.min(100.0, event.endingBatteryPct()));
                        drone.setCurrentBatteryPct(Math.round(clamped * 10.0) / 10.0);
                    }

                    String stopover = event.stopoverType() != null ? event.stopoverType().trim().toLowerCase() : "none";
                    if ("battery_swap".equals(stopover)) {
                        drone.setCurrentBatteryPct(100.0);
                        if (drone.getStatus() == DroneStatus.IN_FLIGHT || drone.getStatus() == DroneStatus.CHARGING) {
                            drone.setStatus(DroneStatus.AVAILABLE);
                        }
                    } else if ("recharge".equals(stopover)) {
                        if (drone.getCurrentBatteryPct() == null || drone.getCurrentBatteryPct() < 99.5) {
                            drone.setStatus(DroneStatus.CHARGING);
                        } else if (drone.getStatus() == DroneStatus.IN_FLIGHT) {
                            drone.setStatus(DroneStatus.AVAILABLE);
                        }
                    } else if (drone.getStatus() == DroneStatus.IN_FLIGHT) {
                        drone.setStatus(DroneStatus.AVAILABLE);
                    }

                    droneRepository.save(drone);
                    log.info("Synced drone {} after FLIGHT_COMPLETED (currentHub={}, battery={}%, stopover={}, status={})",
                            drone.getId(), drone.getCurrentHubId(), drone.getCurrentBatteryPct(), stopover, drone.getStatus());
                }
                case FlightLifecycleEvent.FLIGHT_DIVERTED -> {
                    if (event.actualLandingHubId() != null && !event.actualLandingHubId().isBlank()) {
                        drone.setCurrentHubId(event.actualLandingHubId());
                    }
                    if (event.endingBatteryPct() != null) {
                        double clamped = Math.max(0.0, Math.min(100.0, event.endingBatteryPct()));
                        drone.setCurrentBatteryPct(Math.round(clamped * 10.0) / 10.0);
                    }
                    if (drone.getStatus() == DroneStatus.IN_FLIGHT) {
                        drone.setStatus(DroneStatus.AVAILABLE);
                    }
                    droneRepository.save(drone);
                    log.info("Synced drone {} after FLIGHT_DIVERTED (currentHub={}, battery={}%)",
                            drone.getId(), drone.getCurrentHubId(), drone.getCurrentBatteryPct());
                }
                case FlightLifecycleEvent.FLIGHT_EMERGENCY_LANDING -> {
                    if (event.actualLandingHubId() != null && !event.actualLandingHubId().isBlank()) {
                        drone.setCurrentHubId(event.actualLandingHubId());
                    }
                    if (event.endingBatteryPct() != null) {
                        double clamped = Math.max(0.0, Math.min(100.0, event.endingBatteryPct()));
                        drone.setCurrentBatteryPct(Math.round(clamped * 10.0) / 10.0);
                    }
                    drone.setStatus(DroneStatus.MAINTENANCE);
                    droneRepository.save(drone);
                    log.warn("Synced drone {} status -> MAINTENANCE after FLIGHT_EMERGENCY_LANDING for flight {}",
                            drone.getId(), event.flightId());
                }
                default -> {
                }
            }
        });
    }
}
