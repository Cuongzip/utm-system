package com.utm.emergency.service;

import com.utm.emergency.mapper.BlackboxEntryMapper;
import com.utm.emergency.mapper.EmergencyIncidentMapper;
import com.utm.emergency.model.BlackboxEntry;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.model.enumeration.ResponseAction;
import com.utm.emergency.repository.BlackboxEntryRepository;
import com.utm.emergency.repository.EmergencyIncidentRepository;
import com.utm.emergency.service.client.DroneClientService;
import com.utm.emergency.service.client.FlightClientService;
import com.utm.emergency.service.client.HubClientService;
import com.utm.emergency.viewmodel.incident.IncidentTimelineEventVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResponseExecutorServiceImpl implements ResponseExecutorService {

    private final EmergencyIncidentRepository incidentRepo;
    private final BlackboxEntryRepository blackboxRepo;
    private final DroneClientService droneClient;
    private final FlightClientService flightClient;
    private final HubClientService hubClient;
    private final EmergencyIncidentMapper incidentMapper;
    private final BlackboxEntryMapper blackboxMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public ValidationResult validateAction(EmergencyIncident incident, ResponseAction action) {
        if (action == null) {
            return new ValidationResult(false, "Action is null", ResponseAction.LAND);
        }

        double battery = 50.0;
        if (incident.getDetectionData() != null) {
            try {
                var json = incidentMapper.stringToJsonNode(incident.getDetectionData());
                if (json != null && json.has("batteryPercent")) {
                    battery = json.get("batteryPercent").asDouble();
                } else if (json != null && json.has("batteryLevel")) {
                    battery = json.get("batteryLevel").asDouble();
                }
            } catch (Exception e) {
                log.debug("Unable to parse battery level from detection data: {}", e.getMessage());
            }
        }

        switch (action) {
            case RTH -> {
                if (incident.getFlightId() == null || incident.getFlightId().isBlank()) {
                    return new ValidationResult(false, "No flight associated with incident", ResponseAction.LAND);
                }
                var flightOpt = flightClient.getFlightById(incident.getFlightId());
                if (flightOpt.isEmpty() || flightOpt.get().departureHubId() == null) {
                    return new ValidationResult(false, "Departure hub unknown for RTH", ResponseAction.LAND);
                }

                var hubOpt = hubClient.getHubById(flightOpt.get().departureHubId());
                if (hubOpt.isEmpty() || hubOpt.get().latitude() == null || hubOpt.get().longitude() == null) {
                    return new ValidationResult(false, "Hub location coordinates unavailable", ResponseAction.LAND);
                }

                if (incident.getLatitude() == null || incident.getLongitude() == null) {
                    return new ValidationResult(false, "Current drone position unknown", ResponseAction.LAND);
                }

                double distanceMeters = calculateHaversineDistance(
                        incident.getLatitude(), incident.getLongitude(),
                        hubOpt.get().latitude(), hubOpt.get().longitude()
                );

                double batteryNeeded = (distanceMeters / 1000.0) + 10.0;
                if (battery < batteryNeeded) {
                    log.warn("RTH validation failed: needed {}% battery, current is {}%", batteryNeeded, battery);
                    return new ValidationResult(false, "Insufficient battery for RTH (needed " + Math.round(batteryNeeded) + "%, have " + Math.round(battery) + "%)", ResponseAction.LAND);
                }
                return new ValidationResult(true, "RTH feasible", ResponseAction.RTH);
            }
            case DIVERT -> {
                if (incident.getLatitude() == null || incident.getLongitude() == null) {
                    return new ValidationResult(false, "Position unknown for divert", ResponseAction.LAND);
                }
                var activeHubs = hubClient.getActiveHubs();
                if (activeHubs.isEmpty()) {
                    return new ValidationResult(false, "No active safe zones available", ResponseAction.LAND);
                }
                double minDistance = Double.MAX_VALUE;
                for (var hub : activeHubs) {
                    if (hub.latitude() != null && hub.longitude() != null) {
                        double d = calculateHaversineDistance(incident.getLatitude(), incident.getLongitude(), hub.latitude(), hub.longitude());
                        if (d < minDistance) minDistance = d;
                    }
                }
                double batteryNeeded = (minDistance / 1000.0) + 5.0;
                if (battery < batteryNeeded) {
                    return new ValidationResult(false, "Insufficient battery to divert to nearest hub", ResponseAction.LAND);
                }
                return new ValidationResult(true, "Safe zone diversion feasible", ResponseAction.DIVERT);
            }
            case LAND, HOVER, DESCEND, CLIMB, ESTOP, NONE -> {
                return new ValidationResult(true, "Action safe", action);
            }
        }
        return new ValidationResult(false, "Unknown action: " + action, ResponseAction.LAND);
    }

    @Override
    @Transactional
    public void executeResponse(EmergencyIncident incident, ResponseAction action, ResponseAction fallbackAction) {
        log.info("Executing failsafe response for incident {}: action={}", incident.getId(), action);

        ValidationResult validation = validateAction(incident, action);
        ResponseAction actionToExecute = action;

        if (!validation.safe()) {
            log.warn("Action {} not safe: {}. Evaluating fallback.", action, validation.reason());
            if (fallbackAction != null && fallbackAction != ResponseAction.NONE) {
                ValidationResult fallbackVal = validateAction(incident, fallbackAction);
                if (fallbackVal.safe()) {
                    actionToExecute = fallbackAction;
                } else {
                    actionToExecute = ResponseAction.LAND;
                }
            } else {
                actionToExecute = ResponseAction.LAND;
            }
        }

        incident.setStatus(IncidentStatus.executing);
        incident.setResponseAction(actionToExecute);
        incident.setActionStartedAt(ZonedDateTime.now());
        appendTimeline(incident, "action_executing", Map.of("action", actionToExecute.name()));
        incidentRepo.save(incident);
        broadcastIncident(incident);

        boolean dispatched = droneClient.sendEmergencyCommand(incident.getDroneId(), actionToExecute.name(), incident.getFlightId(), incident.getId());

        recordEmergencyBlackbox(incident, actionToExecute);

        incident.setActionCompletedAt(ZonedDateTime.now());
        incident.setActionSuccess(dispatched);
        if (!dispatched) {
            incident.setActionError("Failed to dispatch failsafe command to drone");
        }
        appendTimeline(incident, dispatched ? "command_dispatched" : "action_dispatch_failed", Map.of("action", actionToExecute.name()));
        incidentRepo.save(incident);
        broadcastIncident(incident);

        log.info("Failsafe action {} dispatched (success: {}) for incident {}", actionToExecute, dispatched, incident.getId());
    }

    private void broadcastIncident(EmergencyIncident incident) {
        var vm = incidentMapper.toVm(incident);
        messagingTemplate.convertAndSend("/topic/emergency/incidents", vm);
        if (incident.getDroneId() != null && !incident.getDroneId().isBlank()) {
            messagingTemplate.convertAndSend("/topic/emergency/drone/" + incident.getDroneId(), vm);
        }
        if (incident.getFlightId() != null && !incident.getFlightId().isBlank()) {
            messagingTemplate.convertAndSend("/topic/emergency/flight/" + incident.getFlightId(), vm);
        }
    }

    private void recordEmergencyBlackbox(EmergencyIncident incident, ResponseAction action) {
        try {
            BlackboxEntry entry = blackboxMapper.toEmergencyEntity(incident, action);
            BlackboxEntry saved = blackboxRepo.save(entry);
            if (incident.getId() != null) {
                messagingTemplate.convertAndSend("/topic/emergency/blackbox/" + incident.getId(), blackboxMapper.toVm(saved));
            }
        } catch (Exception e) {
            log.error("Failed to record emergency blackbox entry: {}", e.getMessage());
        }
    }

    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private void appendTimeline(EmergencyIncident incident, String event, Map<String, Object> data) {
        List<IncidentTimelineEventVm> timeline = new ArrayList<>(incidentMapper.stringToTimelineList(incident.getTimeline()));
        timeline.add(new IncidentTimelineEventVm(ZonedDateTime.now().toString(), event, EmergencyIncidentMapper.OBJECT_MAPPER.valueToTree(data)));
        incident.setTimeline(incidentMapper.timelineListToString(timeline));
    }
}
