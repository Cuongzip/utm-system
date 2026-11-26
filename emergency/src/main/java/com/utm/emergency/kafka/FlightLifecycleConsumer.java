package com.utm.emergency.kafka;

import static com.utm.emergency.kafka.FlightKafkaListenerConfig.FLIGHT_LIFECYCLE_LISTENER_CONTAINER_FACTORY;

import com.utm.commonlibrary.kafka.cdc.BaseCdcConsumer;
import com.utm.commonlibrary.kafka.cdc.RetrySupportDql;
import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.emergency.mapper.EmergencyIncidentMapper;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.IncidentTimelineEntry;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.repository.EmergencyIncidentRepository;
import com.utm.emergency.service.DecisionEngineService;
import com.utm.emergency.service.EmergencyIncidentServiceImpl;
import com.utm.emergency.service.client.AlertClientService;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Headers;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class FlightLifecycleConsumer extends BaseCdcConsumer<String, FlightLifecycleEvent> {

    private final EmergencyIncidentRepository incidentRepository;
    private final EmergencyIncidentMapper incidentMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final DecisionEngineService decisionEngine;
    private final AlertClientService alertClient;

    @KafkaListener(
            id = "emergency-flight-lifecycle",
            groupId = "${spring.kafka.consumer.group-id:emergency-service}",
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
        if (event == null || event.flightId() == null || event.flightId().isBlank() || event.eventType() == null) {
            return;
        }
        boolean terminalSafeEvent = FlightLifecycleEvent.FLIGHT_COMPLETED.equals(event.eventType())
                || FlightLifecycleEvent.FLIGHT_DIVERTED.equals(event.eventType())
                || FlightLifecycleEvent.FLIGHT_EMERGENCY_LANDING.equals(event.eventType())
                || FlightLifecycleEvent.FLIGHT_CANCELLED.equals(event.eventType());
        if (!terminalSafeEvent) {
            return;
        }

        List<EmergencyIncident> openIncidents = incidentRepository.findByFlightIdAndStatusIn(
                event.flightId(), EmergencyIncidentServiceImpl.OPEN_STATUSES);
        if (openIncidents.isEmpty()) {
            return;
        }

        ZonedDateTime now = ZonedDateTime.now();
        List<EmergencyIncidentVm> broadcastVms = new ArrayList<>();
        for (EmergencyIncident incident : openIncidents) {
            if (decisionEngine != null) {
                decisionEngine.cancelPendingConfirmation(incident.getId());
            }
            String notes = "Auto-resolved upon flight event " + event.eventType()
                    + (event.actualLandingHubId() != null ? " at hub " + event.actualLandingHubId() : "");
            incident.setStatus(IncidentStatus.RESOLVED);
            incident.setResolvedAt(now);
            incident.setResolvedBy("system");
            incident.setResolutionNotes(notes);
            appendTimeline(incident, "action_completed", Map.of(
                    "flightEvent", event.eventType(),
                    "flightId", event.flightId(),
                    "landingHubId", event.actualLandingHubId() != null ? event.actualLandingHubId() : ""));
            EmergencyIncident saved = incidentRepository.save(incident);
            broadcastVms.add(incidentMapper.toVm(saved));
            if (alertClient != null) {
                alertClient.resolveAlertsByIncident(saved.getId(), notes);
            }
            log.info("Auto-resolved emergency incident {} upon {} for flight {}",
                    saved.getId(), event.eventType(), event.flightId());
        }

        Runnable broadcastAction = () -> {
            for (EmergencyIncidentVm vm : broadcastVms) {
                messagingTemplate.convertAndSend("/topic/emergency/incidents", vm);
                if (vm.droneId() != null && !vm.droneId().isBlank()) {
                    messagingTemplate.convertAndSend("/topic/emergency/drone/" + vm.droneId(), vm);
                }
                if (vm.flightId() != null && !vm.flightId().isBlank()) {
                    messagingTemplate.convertAndSend("/topic/emergency/flight/" + vm.flightId(), vm);
                }
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    broadcastAction.run();
                }
            });
        } else {
            broadcastAction.run();
        }
    }

    private void appendTimeline(EmergencyIncident incident, String event, Map<String, Object> data) {
        List<IncidentTimelineEntry> timeline = incident.getTimeline() != null
                ? new ArrayList<>(incident.getTimeline())
                : new ArrayList<>();
        timeline.add(new IncidentTimelineEntry(ZonedDateTime.now().toString(), event, data));
        incident.setTimeline(timeline);
    }
}
