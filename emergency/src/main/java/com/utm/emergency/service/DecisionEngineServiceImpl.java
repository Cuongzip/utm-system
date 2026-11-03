package com.utm.emergency.service;

import com.utm.emergency.mapper.EmergencyIncidentMapper;
import com.utm.emergency.mapper.EmergencyProtocolMapper;
import com.utm.emergency.model.EmergencyConfig;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.EmergencyProtocol;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.model.enumeration.OperationMode;
import com.utm.emergency.repository.EmergencyConfigRepository;
import com.utm.emergency.repository.EmergencyIncidentRepository;
import com.utm.emergency.repository.EmergencyProtocolRepository;
import com.utm.emergency.service.client.AlertClientService;
import com.utm.emergency.viewmodel.config.OperationModeVm;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentVm;
import com.utm.emergency.viewmodel.incident.IncidentTimelineEventVm;
import com.utm.emergency.viewmodel.incident.PendingConfirmationVm;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class DecisionEngineServiceImpl implements DecisionEngineService {

    private final EmergencyIncidentRepository incidentRepo;
    private final EmergencyProtocolRepository protocolRepo;
    private final EmergencyConfigRepository configRepo;
    private final EmergencyIncidentMapper incidentMapper;
    private final EmergencyProtocolMapper protocolMapper;
    private final AlertClientService alertClient;
    private final SimpMessagingTemplate messagingTemplate;
    private final ResponseExecutorService responseExecutorService;

    private OperationMode mode = OperationMode.supervised;
    private volatile List<EmergencyProtocol> cachedProtocols = new ArrayList<>();
    private final Map<String, PendingItem> pendingConfirmations = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);

    public record PendingItem(
            EmergencyIncident incident,
            EmergencyProtocol protocol,
            ZonedDateTime timeoutAt,
            ScheduledFuture<?> timerFuture) {
    }

    private static final Map<EmergencyType, Integer> EMERGENCY_PRIORITY = Map.ofEntries(
            Map.entry(EmergencyType.collision_aircraft, 1),
            Map.entry(EmergencyType.collision_obstacle, 2),
            Map.entry(EmergencyType.motor_failure, 10),
            Map.entry(EmergencyType.motor_anomaly, 15),
            Map.entry(EmergencyType.gps_lost, 20),
            Map.entry(EmergencyType.gps_degraded, 25),
            Map.entry(EmergencyType.geofence_breach, 30),
            Map.entry(EmergencyType.geofence_warning, 35),
            Map.entry(EmergencyType.battery_critical, 40),
            Map.entry(EmergencyType.battery_low, 45),
            Map.entry(EmergencyType.battery_rapid_discharge, 50),
            Map.entry(EmergencyType.signal_lost, 55),
            Map.entry(EmergencyType.signal_weak, 60),
            Map.entry(EmergencyType.weather_wind, 70),
            Map.entry(EmergencyType.weather_visibility, 75));

    @PostConstruct
    public void init() {
        reloadProtocols();
        configRepo.findByKey("operation_mode").ifPresent(cfg -> {
            try {
                String val = cfg.getValue().replace("\"", "").trim();
                this.mode = OperationMode.valueOf(val);
                log.info("Loaded emergency operation mode: {}", this.mode);
            } catch (Exception e) {
                log.warn("Invalid operation mode in DB, keeping default: {}", this.mode);
            }
        });
    }

    @Override
    public synchronized void reloadProtocols() {
        this.cachedProtocols = protocolRepo.findByIsActiveOrderByPriorityAscEmergencyTypeAsc(true);
        log.info("Decision Engine loaded {} active emergency protocols", cachedProtocols.size());
    }

    @Override
    public OperationMode getMode() {
        return this.mode;
    }

    @Override
    @Transactional
    public void setMode(OperationMode mode) {
        this.mode = mode;
        EmergencyConfig config = configRepo.findByKey("operation_mode")
                .orElse(EmergencyConfig.builder()
                        .key("operation_mode")
                        .description("Emergency response operation mode: auto or supervised")
                        .build());
        config.setValue("\"" + mode.name() + "\"");
        configRepo.save(config);
        messagingTemplate.convertAndSend("/topic/emergency/mode", new OperationModeVm(mode));
        log.info("Emergency operation mode updated to: {}", mode);
    }

    @Override
    public List<PendingConfirmationVm> getPendingConfirmations() {
        return pendingConfirmations.entrySet().stream()
                .map(entry -> new PendingConfirmationVm(
                        entry.getKey(),
                        incidentMapper.toVm(entry.getValue().incident()),
                        protocolMapper.toVm(entry.getValue().protocol()),
                        entry.getValue().timeoutAt()))
                .toList();
    }

    @Override
    @Transactional
    public EmergencyIncidentVm confirmAction(String incidentId, boolean approved, String userId) {
        PendingItem item = pendingConfirmations.remove(incidentId);
        if (item == null) {
            throw new IllegalArgumentException("No pending confirmation found for incident id: " + incidentId);
        }

        if (item.timerFuture() != null) {
            item.timerFuture().cancel(true);
        }

        EmergencyIncident incident = item.incident();
        incident.setConfirmedBy(userId != null ? userId : "operator");
        incident.setConfirmedAt(ZonedDateTime.now());

        if (approved) {
            log.info("Action {} confirmed by user {} for incident {}", incident.getResponseAction(), userId,
                    incidentId);
            responseExecutorService.executeResponse(incident, item.protocol().getResponseAction(),
                    item.protocol().getFallbackAction());
        } else {
            log.info("Action rejected by user {} for incident {}", userId, incidentId);
            incident.setStatus(IncidentStatus.resolved);
            incident.setResolvedAt(ZonedDateTime.now());
            incident.setResolvedBy(userId);
            incident.setResolutionNotes("Action rejected by operator");
            appendTimeline(incident, "action_rejected", Map.of("operator", userId != null ? userId : "unknown"));
            incidentRepo.save(incident);
        }

        messagingTemplate.convertAndSend("/topic/emergency/confirmed", (Object) Map.of(
                "incidentId", incidentId,
                "approved", approved,
                "confirmedBy", userId != null ? userId : "operator",
                "action", incident.getResponseAction() != null ? incident.getResponseAction().name() : ""));
        broadcastIncident(incident);

        return incidentMapper.toVm(incident);
    }

    @Override
    public EmergencyProtocol findMatchingProtocol(EmergencyType type, EmergencySeverity severity) {
        return cachedProtocols.stream()
                .filter(p -> p.getEmergencyType() == type && p.getSeverity() == severity)
                .findFirst()
                .or(() -> cachedProtocols.stream().filter(p -> p.getEmergencyType() == type).findFirst())
                .orElse(null);
    }

    @Override
    @Transactional
    public void processEmergency(EmergencyIncident incident) {
        EmergencyProtocol protocol = findMatchingProtocol(incident.getEmergencyType(), incident.getSeverity());
        if (protocol == null) {
            log.warn("No matching protocol for {} (severity: {}). Using immediate LAND.", incident.getEmergencyType(),
                    incident.getSeverity());
            responseExecutorService.executeResponse(incident, com.utm.emergency.model.enumeration.ResponseAction.LAND,
                    null);
            return;
        }

        boolean requiresConfirm = (this.mode == OperationMode.supervised) &&
                incident.getSeverity() != EmergencySeverity.emergency &&
                protocol.isRequiresConfirmation();

        if (!requiresConfirm) {
            incident.setWasAutoExecuted(true);
            responseExecutorService.executeResponse(incident, protocol.getResponseAction(),
                    protocol.getFallbackAction());
        } else {
            queueForConfirmation(incident, protocol);
        }
    }

    private void queueForConfirmation(EmergencyIncident incident, EmergencyProtocol protocol) {
        int timeoutSec = protocol.getConfirmationTimeoutSeconds() > 0 ? protocol.getConfirmationTimeoutSeconds() : 30;
        ZonedDateTime timeoutAt = ZonedDateTime.now().plusSeconds(timeoutSec);

        incident.setStatus(IncidentStatus.pending_confirmation);
        incident.setConfirmationRequired(true);
        incident.setConfirmationTimeoutAt(timeoutAt);
        incident.setResponseAction(protocol.getResponseAction());
        appendTimeline(incident, "awaiting_confirmation", Map.of(
                "action", protocol.getResponseAction().name(),
                "timeoutSeconds", timeoutSec));
        incidentRepo.save(incident);
        messagingTemplate.convertAndSend("/topic/emergency/pending", new PendingConfirmationVm(
                incident.getId(),
                incidentMapper.toVm(incident),
                protocolMapper.toVm(protocol),
                timeoutAt));
        broadcastIncident(incident);

        alertClient.publishAlert(new AlertClientService.AlertPostVm(
                incident.getDroneId(),
                incident.getFlightId(),
                incident.getEmergencyType().name(),
                incident.getSeverity().name(),
                "CRITICAL EMERGENCY: Action " + protocol.getResponseAction() + " awaits confirmation. Timeout in "
                        + timeoutSec + "s",
                "active"));

        ScheduledFuture<?> timer = scheduler.schedule(() -> {
            try {
                handleTimeout(incident.getId());
            } catch (Exception ex) {
                log.error("Error executing confirmation timeout for incident {}: {}", incident.getId(),
                        ex.getMessage());
            }
        }, timeoutSec, TimeUnit.SECONDS);

        pendingConfirmations.put(incident.getId(), new PendingItem(incident, protocol, timeoutAt, timer));
        log.info("Incident {} queued for confirmation (timeout: {}s)", incident.getId(), timeoutSec);
    }

    @Transactional
    public void handleTimeout(String incidentId) {
        PendingItem item = pendingConfirmations.remove(incidentId);
        if (item == null)
            return;

        EmergencyIncident incident = incidentRepo.findById(incidentId).orElse(item.incident());
        if (incident.getStatus() != IncidentStatus.pending_confirmation)
            return;

        if (item.protocol().isAutoExecuteOnTimeout()) {
            log.warn("Timeout reached for incident {}. Auto-executing action: {}", incidentId,
                    item.protocol().getResponseAction());
            incident.setWasAutoExecuted(true);
            appendTimeline(incident, "confirmation_timeout_auto_executed",
                    Map.of("action", item.protocol().getResponseAction().name()));
            responseExecutorService.executeResponse(incident, item.protocol().getResponseAction(),
                    item.protocol().getFallbackAction());
        } else {
            log.warn("Timeout reached for incident {}. Protocol requires escalation.", incidentId);
            incident.setStatus(IncidentStatus.escalated);
            appendTimeline(incident, "confirmation_timeout_escalated", Map.of());
            incidentRepo.save(incident);
            broadcastIncident(incident);
        }
    }

    private void broadcastIncident(EmergencyIncident incident) {
        EmergencyIncidentVm vm = incidentMapper.toVm(incident);
        messagingTemplate.convertAndSend("/topic/emergency/incidents", vm);
        if (incident.getDroneId() != null && !incident.getDroneId().isBlank()) {
            messagingTemplate.convertAndSend("/topic/emergency/drone/" + incident.getDroneId(), vm);
        }
        if (incident.getFlightId() != null && !incident.getFlightId().isBlank()) {
            messagingTemplate.convertAndSend("/topic/emergency/flight/" + incident.getFlightId(), vm);
        }
    }

    @Override
    public List<EmergencyIncident> prioritizeEmergencies(List<EmergencyIncident> incidents) {
        if (incidents == null)
            return List.of();
        return incidents.stream()
                .sorted(Comparator.comparingInt(i -> EMERGENCY_PRIORITY.getOrDefault(i.getEmergencyType(), 100)))
                .toList();
    }

    private void appendTimeline(EmergencyIncident incident, String event, Map<String, Object> data) {
        List<IncidentTimelineEventVm> timeline = new ArrayList<>(
                incidentMapper.stringToTimelineList(incident.getTimeline()));
        timeline.add(new IncidentTimelineEventVm(ZonedDateTime.now().toString(), event,
                EmergencyIncidentMapper.OBJECT_MAPPER.valueToTree(data)));
        incident.setTimeline(incidentMapper.timelineListToString(timeline));
    }

    @PreDestroy
    public void destroy() {
        scheduler.shutdownNow();
    }
}