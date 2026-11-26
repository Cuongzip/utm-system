package com.utm.emergency.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.kafka.event.EmergencyStateEvent;
import com.utm.emergency.kafka.EmergencyEventPublisher;
import com.utm.emergency.mapper.EmergencyConfigMapper;
import com.utm.emergency.mapper.EmergencyIncidentMapper;
import com.utm.emergency.mapper.EmergencyProtocolMapper;
import com.utm.emergency.model.EmergencyConfig;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.EmergencyProtocol;
import com.utm.emergency.model.IncidentTimelineEntry;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.model.enumeration.OperationMode;
import com.utm.emergency.model.enumeration.ResponseAction;
import com.utm.emergency.repository.EmergencyConfigRepository;
import com.utm.emergency.repository.EmergencyIncidentRepository;
import com.utm.emergency.repository.EmergencyProtocolRepository;
import com.utm.emergency.service.client.AlertClientService;
import com.utm.emergency.viewmodel.client.AlertPostVm;
import com.utm.emergency.viewmodel.config.OperationModeVm;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentVm;
import com.utm.emergency.viewmodel.incident.EmergencyNotificationVm;
import com.utm.emergency.viewmodel.incident.PendingConfirmationVm;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class DecisionEngineServiceImpl implements DecisionEngineService {

    private final EmergencyIncidentRepository incidentRepo;
    private final EmergencyProtocolRepository protocolRepo;
    private final EmergencyConfigRepository configRepo;
    private final EmergencyConfigMapper configMapper;
    private final EmergencyIncidentMapper incidentMapper;
    private final EmergencyProtocolMapper protocolMapper;
    private final AlertClientService alertClient;
    private final SimpMessagingTemplate messagingTemplate;
    private final ResponseExecutorService responseExecutorService;
    private final TransactionTemplate transactionTemplate;
    private final EmergencyEventPublisher emergencyEventPublisher;

    public DecisionEngineServiceImpl(
            EmergencyIncidentRepository incidentRepo,
            EmergencyProtocolRepository protocolRepo,
            EmergencyConfigRepository configRepo,
            EmergencyConfigMapper configMapper,
            EmergencyIncidentMapper incidentMapper,
            EmergencyProtocolMapper protocolMapper,
            AlertClientService alertClient,
            SimpMessagingTemplate messagingTemplate,
            ResponseExecutorService responseExecutorService,
            TransactionTemplate transactionTemplate) {
        this(incidentRepo, protocolRepo, configRepo, configMapper, incidentMapper,
                protocolMapper, alertClient, messagingTemplate, responseExecutorService,
                transactionTemplate, null);
    }

    @Autowired
    public DecisionEngineServiceImpl(
            EmergencyIncidentRepository incidentRepo,
            EmergencyProtocolRepository protocolRepo,
            EmergencyConfigRepository configRepo,
            EmergencyConfigMapper configMapper,
            EmergencyIncidentMapper incidentMapper,
            EmergencyProtocolMapper protocolMapper,
            AlertClientService alertClient,
            SimpMessagingTemplate messagingTemplate,
            ResponseExecutorService responseExecutorService,
            @Autowired(required = false) TransactionTemplate transactionTemplate,
            @Autowired(required = false) EmergencyEventPublisher emergencyEventPublisher) {
        this.incidentRepo = incidentRepo;
        this.protocolRepo = protocolRepo;
        this.configRepo = configRepo;
        this.configMapper = configMapper;
        this.incidentMapper = incidentMapper;
        this.protocolMapper = protocolMapper;
        this.alertClient = alertClient;
        this.messagingTemplate = messagingTemplate;
        this.responseExecutorService = responseExecutorService;
        this.transactionTemplate = transactionTemplate;
        this.emergencyEventPublisher = emergencyEventPublisher;
    }

    private volatile OperationMode mode = OperationMode.SUPERVISED;
    private volatile List<EmergencyProtocol> cachedProtocols = new ArrayList<>();
    private final Map<String, PendingItem> pendingConfirmations = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4,
            Thread.ofVirtual().factory());

    public record PendingItem(
            EmergencyIncident incident,
            EmergencyProtocol protocol,
            ZonedDateTime timeoutAt,
            ScheduledFuture<?> timerFuture) {
    }

    private static final Map<EmergencyType, Integer> EMERGENCY_PRIORITY = Map.ofEntries(
            Map.entry(EmergencyType.COLLISION_AIRCRAFT, 1),
            Map.entry(EmergencyType.COLLISION_OBSTACLE, 2),
            Map.entry(EmergencyType.MOTOR_FAILURE, 10),
            Map.entry(EmergencyType.MOTOR_ANOMALY, 15),
            Map.entry(EmergencyType.GPS_LOST, 20),
            Map.entry(EmergencyType.GPS_DEGRADED, 25),
            Map.entry(EmergencyType.GEOFENCE_BREACH, 30),
            Map.entry(EmergencyType.GEOFENCE_WARNING, 35),
            Map.entry(EmergencyType.BATTERY_CRITICAL, 40),
            Map.entry(EmergencyType.BATTERY_LOW, 45),
            Map.entry(EmergencyType.BATTERY_RAPID_DISCHARGE, 50),
            Map.entry(EmergencyType.SIGNAL_LOST, 55),
            Map.entry(EmergencyType.SIGNAL_WEAK, 60),
            Map.entry(EmergencyType.WEATHER_WIND, 70),
            Map.entry(EmergencyType.WEATHER_VISIBILITY, 75));

    @PostConstruct
    public void init() {
        reloadProtocols();
        configRepo.findByKey("operation_mode").ifPresent(cfg -> {
            try {
                String val = cfg.getValue().replace("\"", "").trim();
                OperationMode parsed = OperationMode.fromValue(val);
                if (parsed != null) {
                    this.mode = parsed;
                    log.info("Loaded emergency operation mode: {}", this.mode);
                }
            } catch (Exception e) {
                log.warn("Invalid operation mode in DB, keeping default: {}", this.mode);
            }
        });
        recoverPendingConfirmations();
    }

    void recoverPendingConfirmations() {
        try {
            List<EmergencyIncident> pending = incidentRepo.findByStatusInOrderByDetectedAtDesc(
                    List.of(IncidentStatus.PENDING_CONFIRMATION));
            if (pending == null || pending.isEmpty()) {
                return;
            }
            ZonedDateTime now = ZonedDateTime.now();
            for (EmergencyIncident incident : pending) {
                EmergencyProtocol protocol = findMatchingProtocol(incident.getEmergencyType(), incident.getSeverity());
                if (protocol == null) {
                    continue;
                }
                ZonedDateTime timeoutAt = incident.getConfirmationTimeoutAt() != null
                        ? incident.getConfirmationTimeoutAt()
                        : now.plusSeconds(Math.max(1, protocol.getConfirmationTimeoutSeconds()));
                long remainingSec = Duration.between(now, timeoutAt).getSeconds();
                long delaySec = Math.max(0L, remainingSec);
                ScheduledFuture<?> timer = scheduler.schedule(() -> {
                    try {
                        handleTimeout(incident.getId());
                    } catch (Exception ex) {
                        log.error("Error executing recovered timeout for incident {}: {}",
                                incident.getId(), ex.getMessage());
                    }
                }, delaySec, TimeUnit.SECONDS);
                pendingConfirmations.put(incident.getId(), new PendingItem(incident, protocol, timeoutAt, timer));
            }
            log.info("Recovered {} pending emergency confirmation(s) on startup", pending.size());
        } catch (Exception ex) {
            log.warn("Failed to recover pending emergency confirmations on startup: {}", ex.getMessage());
        }
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
        String val = "\"" + mode.getValue() + "\"";
        String desc = "Emergency response operation mode: auto or supervised";
        EmergencyConfig config = configRepo.findByKey("operation_mode")
                .map(existing -> {
                    configMapper.updateEntity(existing, val, desc);
                    return existing;
                })
                .orElseGet(() -> configMapper.toEntity("operation_mode", val, desc));
        configRepo.save(config);
        runAfterCommit(() -> messagingTemplate.convertAndSend("/topic/emergency/mode", new OperationModeVm(mode)));
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
    public void cancelPendingConfirmation(String incidentId) {
        if (incidentId == null || incidentId.isBlank()) {
            return;
        }
        PendingItem item = pendingConfirmations.remove(incidentId);
        if (item != null && item.timerFuture() != null) {
            item.timerFuture().cancel(false);
        }
    }

    @Override
    @Transactional
    public EmergencyIncidentVm confirmAction(String incidentId, boolean approved, String userId) {
        PendingItem item = pendingConfirmations.remove(incidentId);
        EmergencyIncident incident;
        EmergencyProtocol protocol;

        if (item != null) {
            if (item.timerFuture() != null) {
                item.timerFuture().cancel(true);
            }
            incident = incidentRepo.findById(incidentId).orElse(item.incident());
            protocol = item.protocol();
        } else {
            incident = incidentRepo.findById(incidentId)
                    .filter(existing -> existing.getStatus() == IncidentStatus.PENDING_CONFIRMATION)
                    .orElseThrow(() -> new NotFoundException(MessageCode.PENDING_CONFIRMATION_NOT_FOUND, "id",
                            incidentId));
            protocol = findMatchingProtocol(incident.getEmergencyType(), incident.getSeverity());
        }

        String actor = userId != null && !userId.isBlank() ? userId : "operator";
        incident.setConfirmedBy(actor);
        incident.setConfirmedAt(ZonedDateTime.now());

        if (approved) {
            var responseAction = protocol != null ? protocol.getResponseAction()
                    : (incident.getResponseAction() != null ? incident.getResponseAction() : ResponseAction.LAND);
            var fallbackAction = protocol != null ? protocol.getFallbackAction() : null;
            log.info("Action {} confirmed by user {} for incident {}", responseAction, actor, incidentId);
            responseExecutorService.executeResponse(incident, responseAction, fallbackAction);
        } else {
            log.info("Action rejected by user {} for incident {}", actor, incidentId);
            incident.setStatus(IncidentStatus.REJECTED);
            incident.setResolvedAt(ZonedDateTime.now());
            incident.setResolvedBy(actor);
            incident.setResolutionNotes("Action rejected by operator");
            appendTimeline(incident, "action_rejected", Map.of("operator", actor));
            incidentRepo.save(incident);
            if (emergencyEventPublisher != null) {
                emergencyEventPublisher.publishStateEvent(EmergencyStateEvent.INCIDENT_RESOLVED, incident);
            }
            alertClient.resolveAlertsByIncident(incidentId, "Emergency action rejected by operator " + actor);
        }

        Map<String, Object> confirmPayload = Map.of(
                "incidentId", incidentId,
                "approved", approved,
                "confirmedBy", actor,
                "action", incident.getResponseAction() != null ? incident.getResponseAction().name() : "");
        runAfterCommit(() -> messagingTemplate.convertAndSend("/topic/emergency/confirmed", (Object) confirmPayload));
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
            responseExecutorService.executeResponse(incident, ResponseAction.LAND, null);
            return;
        }

        incident.setProtocolId(protocol.getId());

        boolean immediateBatteryExhaustion = isBatteryBelowCriticalFloor(incident.getDetectionData());
        boolean requiresConfirm = (this.mode == OperationMode.SUPERVISED)
                && incident.getSeverity() != EmergencySeverity.EMERGENCY
                && !immediateBatteryExhaustion
                && protocol.isRequiresConfirmation();

        if (!requiresConfirm) {
            incident.setWasAutoExecuted(true);
            alertClient.publishAlert(buildAlertPayload(
                    incident,
                    protocol,
                    "AUTO FAILSAFE: " + protocol.getResponseAction() + " executing for "
                            + incident.getEmergencyType().getValue() + ". " + incident.getMessage()));
            responseExecutorService.executeResponse(incident, protocol.getResponseAction(),
                    protocol.getFallbackAction());
        } else {
            queueForConfirmation(incident, protocol);
        }
    }

    private void queueForConfirmation(EmergencyIncident incident, EmergencyProtocol protocol) {
        int timeoutSec = protocol.getConfirmationTimeoutSeconds() > 0 ? protocol.getConfirmationTimeoutSeconds() : 30;
        ZonedDateTime timeoutAt = ZonedDateTime.now().plusSeconds(timeoutSec);

        incident.setStatus(IncidentStatus.PENDING_CONFIRMATION);
        incident.setConfirmationRequired(true);
        incident.setConfirmationTimeoutAt(timeoutAt);
        incident.setResponseAction(protocol.getResponseAction());
        appendTimeline(incident, "awaiting_confirmation", Map.of(
                "action", protocol.getResponseAction().name(),
                "timeoutSeconds", timeoutSec));
        incidentRepo.save(incident);

        PendingConfirmationVm pendingVm = new PendingConfirmationVm(
                incident.getId(),
                incidentMapper.toVm(incident),
                protocolMapper.toVm(protocol),
                timeoutAt);
        runAfterCommit(() -> messagingTemplate.convertAndSend("/topic/emergency/pending", pendingVm));
        broadcastIncident(incident);

        alertClient.publishAlert(buildAlertPayload(
                incident,
                protocol,
                "CRITICAL EMERGENCY: Action " + protocol.getResponseAction() + " awaits confirmation. Timeout in "
                        + timeoutSec + "s"));

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

    public void handleTimeout(String incidentId) {
        if (transactionTemplate != null) {
            transactionTemplate.executeWithoutResult(status -> handleTimeoutInternal(incidentId));
        } else {
            handleTimeoutInternal(incidentId);
        }
    }

    private void handleTimeoutInternal(String incidentId) {
        PendingItem item = pendingConfirmations.remove(incidentId);
        if (item == null) {
            return;
        }

        EmergencyIncident incident = incidentRepo.findById(incidentId).orElse(item.incident());
        if (incident.getStatus() != IncidentStatus.PENDING_CONFIRMATION) {
            return;
        }

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
            incident.setStatus(IncidentStatus.ESCALATED);
            appendTimeline(incident, "confirmation_timeout_escalated", Map.of());
            incidentRepo.save(incident);
            broadcastIncident(incident);
        }
    }

    private AlertPostVm buildAlertPayload(EmergencyIncident incident, EmergencyProtocol protocol, String message) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("emergencyType", incident.getEmergencyType() != null ? incident.getEmergencyType().getValue() : null);
        details.put("responseAction", protocol.getResponseAction() != null ? protocol.getResponseAction().name() : null);
        details.put("protocolId", protocol.getId());
        return new AlertPostVm(
                mapEmergencyTypeToAlertType(incident.getEmergencyType()),
                mapToAlertSeverity(incident.getSeverity()),
                incident.getFlightId(),
                incident.getDroneId(),
                null,
                null,
                incident.getId(),
                message,
                details);
    }

    private String mapEmergencyTypeToAlertType(EmergencyType type) {
        if (type == null) {
            return "EMERGENCY_INCIDENT";
        }
        return switch (type) {
            case BATTERY_LOW, BATTERY_CRITICAL, BATTERY_RAPID_DISCHARGE -> "BATTERY_LOW";
            case SIGNAL_LOST, SIGNAL_WEAK -> "SIGNAL_LOSS";
            case GEOFENCE_BREACH, GEOFENCE_WARNING -> "GEOFENCE_VIOLATION";
            case COLLISION_AIRCRAFT, COLLISION_OBSTACLE -> "COLLISION_WARNING";
            case MOTOR_FAILURE, MOTOR_ANOMALY -> "MOTOR_FAILURE";
            case GPS_LOST, GPS_DEGRADED -> "GPS_FAILURE";
            case WEATHER_WIND, WEATHER_VISIBILITY -> "EMERGENCY_INCIDENT";
        };
    }

    private void broadcastIncident(EmergencyIncident incident) {
        EmergencyIncidentVm vm = incidentMapper.toVm(incident);
        String droneId = incident.getDroneId();
        String flightId = incident.getFlightId();
        int priority = EMERGENCY_PRIORITY.getOrDefault(incident.getEmergencyType(), 50);
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
                priority,
                playAlarm,
                incident.getStatus() == IncidentStatus.PENDING_CONFIRMATION,
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

    @Override
    public List<EmergencyIncident> prioritizeEmergencies(List<EmergencyIncident> incidents) {
        if (incidents == null) {
            return List.of();
        }
        return incidents.stream()
                .sorted(Comparator.comparingInt(i -> EMERGENCY_PRIORITY.getOrDefault(i.getEmergencyType(), 100)))
                .toList();
    }

    private void appendTimeline(EmergencyIncident incident, String event, Map<String, Object> data) {
        List<IncidentTimelineEntry> timeline = incident.getTimeline() != null
                ? new ArrayList<>(incident.getTimeline())
                : new ArrayList<>();
        timeline.add(new IncidentTimelineEntry(ZonedDateTime.now().toString(), event, data));
        incident.setTimeline(timeline);
    }

    private static boolean isBatteryBelowCriticalFloor(Map<String, Object> detectionData) {
        if (detectionData == null || detectionData.isEmpty()) {
            return false;
        }
        for (String key : List.of("batteryPercentage", "batteryPercent", "batteryLevel", "batteryPct")) {
            Object value = detectionData.get(key);
            if (value instanceof Number num) {
                return num.doubleValue() < 5.0;
            }
            if (value instanceof String str) {
                try {
                    return Double.parseDouble(str.trim()) < 5.0;
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return false;
    }

    private String mapToAlertSeverity(EmergencySeverity severity) {
        if (severity == null) {
            return "HIGH";
        }
        return switch (severity) {
            case EMERGENCY -> "CRITICAL";
            case CRITICAL -> "HIGH";
            case WARNING -> "MEDIUM";
        };
    }

    @PreDestroy
    public void destroy() {
        scheduler.shutdownNow();
    }
}
