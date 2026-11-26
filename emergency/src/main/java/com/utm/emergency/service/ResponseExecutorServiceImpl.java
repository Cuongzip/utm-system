package com.utm.emergency.service;

import com.utm.commonlibrary.kafka.event.EmergencyStateEvent;
import com.utm.emergency.kafka.EmergencyEventPublisher;
import com.utm.emergency.mapper.BlackboxEntryMapper;
import com.utm.emergency.mapper.EmergencyIncidentMapper;
import com.utm.emergency.model.BlackboxEntry;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.IncidentTimelineEntry;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.model.enumeration.ResponseAction;
import com.utm.emergency.repository.BlackboxEntryRepository;
import com.utm.emergency.repository.EmergencyIncidentRepository;
import com.utm.emergency.service.client.DroneClientService;
import com.utm.emergency.service.client.FlightClientService;
import com.utm.emergency.service.client.HubClientService;
import com.utm.emergency.service.client.TelemetryClientService;
import com.utm.emergency.viewmodel.client.HubLocationVm;
import com.utm.emergency.viewmodel.client.TelemetryStreamVm;
import com.utm.emergency.viewmodel.incident.EmergencyNotificationVm;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class ResponseExecutorServiceImpl implements ResponseExecutorService {

    private final EmergencyIncidentRepository incidentRepo;
    private final BlackboxEntryRepository blackboxRepo;
    private final DroneClientService droneClient;
    private final FlightClientService flightClient;
    private final HubClientService hubClient;
    private final TelemetryClientService telemetryClient;
    private final EmergencyIncidentMapper incidentMapper;
    private final BlackboxEntryMapper blackboxMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final EmergencyEventPublisher emergencyEventPublisher;

    public ResponseExecutorServiceImpl(
            EmergencyIncidentRepository incidentRepo,
            BlackboxEntryRepository blackboxRepo,
            DroneClientService droneClient,
            FlightClientService flightClient,
            HubClientService hubClient,
            TelemetryClientService telemetryClient,
            EmergencyIncidentMapper incidentMapper,
            BlackboxEntryMapper blackboxMapper,
            SimpMessagingTemplate messagingTemplate) {
        this(incidentRepo, blackboxRepo, droneClient, flightClient, hubClient,
                telemetryClient, incidentMapper, blackboxMapper, messagingTemplate, null);
    }

    @Autowired
    public ResponseExecutorServiceImpl(
            EmergencyIncidentRepository incidentRepo,
            BlackboxEntryRepository blackboxRepo,
            DroneClientService droneClient,
            FlightClientService flightClient,
            HubClientService hubClient,
            TelemetryClientService telemetryClient,
            EmergencyIncidentMapper incidentMapper,
            BlackboxEntryMapper blackboxMapper,
            SimpMessagingTemplate messagingTemplate,
            @Autowired(required = false) EmergencyEventPublisher emergencyEventPublisher) {
        this.incidentRepo = incidentRepo;
        this.blackboxRepo = blackboxRepo;
        this.droneClient = droneClient;
        this.flightClient = flightClient;
        this.hubClient = hubClient;
        this.telemetryClient = telemetryClient;
        this.incidentMapper = incidentMapper;
        this.blackboxMapper = blackboxMapper;
        this.messagingTemplate = messagingTemplate;
        this.emergencyEventPublisher = emergencyEventPublisher;
    }

    @Override
    public ValidationResult validateAction(EmergencyIncident incident, ResponseAction action) {
        if (action == null) {
            return new ValidationResult(false, "Action is null", ResponseAction.LAND);
        }

        double battery = extractBatteryLevel(incident.getDetectionData());

        return switch (action) {
            case RTH -> {
                if (incident.getFlightId() == null || incident.getFlightId().isBlank()) {
                    yield new ValidationResult(false, "No flight associated with incident", ResponseAction.LAND);
                }
                var flightOpt = flightClient.getFlightById(incident.getFlightId());
                if (flightOpt.isEmpty() || flightOpt.get().departureHubId() == null) {
                    yield new ValidationResult(false, "Departure hub unknown for RTH", ResponseAction.LAND);
                }

                var hubOpt = hubClient.getHubById(flightOpt.get().departureHubId());
                if (hubOpt.isEmpty() || hubOpt.get().latitude() == null || hubOpt.get().longitude() == null) {
                    yield new ValidationResult(false, "Hub location coordinates unavailable", ResponseAction.LAND);
                }

                hydrateIncidentCoordinatesIfMissing(incident);
                if (incident.getLatitude() == null || incident.getLongitude() == null) {
                    yield new ValidationResult(false, "Current drone position unknown", ResponseAction.LAND);
                }

                double distanceMeters = calculateHaversineDistance(
                        incident.getLatitude(), incident.getLongitude(),
                        hubOpt.get().latitude(), hubOpt.get().longitude());

                double batteryNeeded = (distanceMeters / 1000.0) + 10.0;
                if (battery < batteryNeeded) {
                    log.warn("RTH validation failed: needed {}% battery, current is {}%", batteryNeeded, battery);
                    yield new ValidationResult(false,
                            "Insufficient battery for RTH (needed " + Math.round(batteryNeeded) + "%, have "
                                    + Math.round(battery) + "%)",
                            ResponseAction.LAND);
                }
                yield new ValidationResult(true, "RTH feasible", ResponseAction.RTH);
            }
            case DIVERT -> {
                hydrateIncidentCoordinatesIfMissing(incident);
                if (incident.getLatitude() == null || incident.getLongitude() == null) {
                    yield new ValidationResult(false, "Position unknown for divert", ResponseAction.LAND);
                }
                var activeHubs = hubClient.getActiveHubs();
                if (activeHubs.isEmpty()) {
                    yield new ValidationResult(false, "No active safe zones available", ResponseAction.LAND);
                }
                double minDistance = Double.MAX_VALUE;
                for (var hub : activeHubs) {
                    if (hub.latitude() != null && hub.longitude() != null) {
                        double d = calculateHaversineDistance(
                                incident.getLatitude(), incident.getLongitude(),
                                hub.latitude(), hub.longitude());
                        if (d < minDistance) {
                            minDistance = d;
                        }
                    }
                }
                double batteryNeeded = (minDistance / 1000.0) + 5.0;
                if (battery < batteryNeeded) {
                    yield new ValidationResult(false, "Insufficient battery to divert to nearest hub",
                            ResponseAction.LAND);
                }
                yield new ValidationResult(true, "Safe zone diversion feasible", ResponseAction.DIVERT);
            }
            case LAND, HOVER, DESCEND, CLIMB, ESTOP, NONE -> new ValidationResult(true, "Action safe", action);
        };
    }

    @Override
    @Transactional
    public void executeResponse(EmergencyIncident incident, ResponseAction action, ResponseAction fallbackAction) {
        log.info("Executing failsafe response for incident {}: action={}", incident.getId(), action);

        ValidationResult validation = validateAction(incident, action);
        ResponseAction actionToExecute = action;

        if (!validation.safe()) {
            log.warn("Action {} not safe: {}. Evaluating fallback.", action, validation.reason());
            double currentBattery = extractBatteryLevel(incident.getDetectionData());
            ResponseAction ultimateSafeAction = currentBattery <= 5.0 ? ResponseAction.LAND : ResponseAction.HOVER;
            if (fallbackAction != null && fallbackAction != ResponseAction.NONE) {
                ValidationResult fallbackVal = validateAction(incident, fallbackAction);
                actionToExecute = fallbackVal.safe() ? fallbackAction : ultimateSafeAction;
            } else {
                actionToExecute = ultimateSafeAction;
            }
        }

        incident.setStatus(IncidentStatus.EXECUTING);
        incident.setResponseAction(actionToExecute);
        incident.setActionStartedAt(ZonedDateTime.now());
        appendTimeline(incident, "action_executing", Map.of("action", actionToExecute.name()));
        incidentRepo.save(incident);
        broadcastIncident(incident);

        Map<String, Object> extraParams = buildCommandParameters(incident, actionToExecute);
        boolean dispatched;
        if (actionToExecute == ResponseAction.NONE) {
            dispatched = true;
        } else if (extraParams.isEmpty()) {
            dispatched = droneClient.sendEmergencyCommand(incident.getDroneId(), actionToExecute.name(),
                    incident.getFlightId(), incident.getId());
        } else {
            dispatched = droneClient.sendEmergencyCommand(incident.getDroneId(), actionToExecute.name(),
                    incident.getFlightId(), incident.getId(), extraParams);
        }

        if (!dispatched && emergencyEventPublisher != null && actionToExecute != ResponseAction.NONE) {
            emergencyEventPublisher.publishP0DroneCommand(incident, actionToExecute, extraParams);
        }

        recordEmergencyBlackbox(incident, actionToExecute);

        incident.setActionCompletedAt(ZonedDateTime.now());
        incident.setActionSuccess(dispatched);
        if (!dispatched) {
            incident.setActionError("Failed to dispatch failsafe command to drone");
        }
        appendTimeline(incident, dispatched ? "command_dispatched" : "action_dispatch_failed",
                Map.of("action", actionToExecute.name()));
        incidentRepo.save(incident);
        broadcastIncident(incident);

        log.info("Failsafe action {} dispatched (success: {}) for incident {}", actionToExecute, dispatched,
                incident.getId());
    }

    private void hydrateIncidentCoordinatesIfMissing(EmergencyIncident incident) {
        if (incident == null || (incident.getLatitude() != null && incident.getLongitude() != null)) {
            return;
        }
        if (telemetryClient != null && incident.getDroneId() != null && !incident.getDroneId().isBlank()) {
            try {
                telemetryClient.getLatestByDroneId(incident.getDroneId()).ifPresent(latest -> {
                    if (latest.latitude() != null && latest.longitude() != null) {
                        incident.setLatitude(latest.latitude());
                        incident.setLongitude(latest.longitude());
                        if (incident.getAltitude() == null && latest.altitude() != null) {
                            incident.setAltitude(latest.altitude());
                        }
                    }
                });
            } catch (Exception ex) {
                log.debug("Could not hydrate missing incident coordinates from telemetry for drone {}: {}",
                        incident.getDroneId(), ex.getMessage());
            }
        }
    }

    private double extractBatteryLevel(Map<String, Object> detectionData) {
        if (detectionData == null) {
            return 50.0;
        }
        for (String key : List.of("batteryPercentage", "batteryPercent", "batteryLevel", "batteryPct")) {
            Object value = detectionData.get(key);
            if (value instanceof Number num) {
                return num.doubleValue();
            }
            if (value instanceof String str) {
                try {
                    return Double.parseDouble(str.trim());
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return 50.0;
    }

    private Map<String, Object> buildCommandParameters(EmergencyIncident incident, ResponseAction action) {
        Map<String, Object> params = new LinkedHashMap<>();
        if (action == ResponseAction.DIVERT && incident.getLatitude() != null && incident.getLongitude() != null) {
            var activeHubs = hubClient.getActiveHubs();
            HubLocationVm nearest = null;
            double minDist = Double.MAX_VALUE;
            for (var hub : activeHubs) {
                if (hub.latitude() != null && hub.longitude() != null) {
                    double d = calculateHaversineDistance(incident.getLatitude(), incident.getLongitude(),
                            hub.latitude(), hub.longitude());
                    if (d < minDist) {
                        minDist = d;
                        nearest = hub;
                    }
                }
            }
            if (nearest != null) {
                params.put("targetHubId", nearest.id());
                params.put("latitude", nearest.latitude());
                params.put("longitude", nearest.longitude());
                params.put("altitude",
                        incident.getAltitude() != null ? Math.max(30.0, incident.getAltitude()) : 50.0);
            }
        } else if (action == ResponseAction.RTH && incident.getFlightId() != null && !incident.getFlightId().isBlank()) {
            flightClient.getFlightById(incident.getFlightId()).ifPresent(flight -> {
                if (flight.departureHubId() != null) {
                    hubClient.getHubById(flight.departureHubId()).ifPresent(hub -> {
                        if (hub.latitude() != null && hub.longitude() != null) {
                            params.put("targetHubId", hub.id());
                            params.put("latitude", hub.latitude());
                            params.put("longitude", hub.longitude());
                        }
                    });
                }
            });
        } else if (action == ResponseAction.DESCEND) {
            double currentAlt = incident.getAltitude() != null ? incident.getAltitude() : 50.0;
            params.put("targetAltitude", Math.max(15.0, currentAlt - 30.0));
        } else if (action == ResponseAction.CLIMB) {
            double currentAlt = incident.getAltitude() != null ? incident.getAltitude() : 50.0;
            params.put("targetAltitude", Math.min(120.0, currentAlt + 30.0));
        }
        return params;
    }

    private void broadcastIncident(EmergencyIncident incident) {
        var vm = incidentMapper.toVm(incident);
        String droneId = incident.getDroneId();
        String flightId = incident.getFlightId();
        boolean playAlarm = incident.getSeverity() == EmergencySeverity.EMERGENCY
                || incident.getSeverity() == EmergencySeverity.CRITICAL;
        EmergencyNotificationVm notificationVm = new EmergencyNotificationVm(
                incident.getId(),
                incident.getIncidentNumber(),
                droneId,
                flightId,
                incident.getEmergencyType() != null ? incident.getEmergencyType().getValue() : null,
                incident.getSeverity() != null ? incident.getSeverity().getValue() : null,
                incident.getStatus() != null ? incident.getStatus().getValue() : null,
                incident.getResponseAction() != null ? incident.getResponseAction().name() : null,
                playAlarm ? 1 : 50,
                playAlarm,
                false,
                incident.getConfirmationTimeoutAt(),
                incident.getId() != null ? "/emergency/incidents/" + incident.getId() : "/emergency",
                incident.getMessage(),
                ZonedDateTime.now());
        if (emergencyEventPublisher != null) {
            emergencyEventPublisher.publishStateEvent(EmergencyStateEvent.INCIDENT_CREATED, incident);
        }
        runAfterCommit(() -> {
            messagingTemplate.convertAndSend("/topic/emergency/incidents", vm);
            messagingTemplate.convertAndSend("/topic/emergency/notifications", notificationVm);
            if (droneId != null && !droneId.isBlank()) {
                messagingTemplate.convertAndSend("/topic/emergency/drone/" + droneId, vm);
            }
            if (flightId != null && !flightId.isBlank()) {
                messagingTemplate.convertAndSend("/topic/emergency/flight/" + flightId, vm);
            }
        });
    }

    private void recordEmergencyBlackbox(EmergencyIncident incident, ResponseAction action) {
        try {
            Optional<TelemetryStreamVm> latestTelemetry = telemetryClient != null
                    ? telemetryClient.getLatestByDroneId(incident.getDroneId())
                    : Optional.empty();
            BlackboxEntry entry = latestTelemetry.isPresent()
                    ? blackboxMapper.toEmergencyEntity(incident, action, latestTelemetry.get())
                    : blackboxMapper.toEmergencyEntity(incident, action);
            BlackboxEntry saved = blackboxRepo.save(entry);
            if (incident.getId() != null) {
                var bbVm = blackboxMapper.toVm(saved);
                String incidentId = incident.getId();
                runAfterCommit(() -> messagingTemplate.convertAndSend("/topic/emergency/blackbox/" + incidentId, bbVm));
            }
        } catch (Exception e) {
            log.error("Failed to record emergency blackbox entry: {}", e.getMessage());
        }
    }

    private void runAfterCommit(Runnable task) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
        } else {
            task.run();
        }
    }

    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private void appendTimeline(EmergencyIncident incident, String event, Map<String, Object> data) {
        List<IncidentTimelineEntry> timeline = incident.getTimeline() != null
                ? new ArrayList<>(incident.getTimeline())
                : new ArrayList<>();
        timeline.add(new IncidentTimelineEntry(ZonedDateTime.now().toString(), event, data));
        incident.setTimeline(timeline);
    }
}
