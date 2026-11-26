package com.utm.emergency.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.generator.BusinessCodeGenerator;
import com.utm.commonlibrary.generator.CodePatternRule;
import com.utm.commonlibrary.kafka.event.EmergencyStateEvent;
import com.utm.emergency.kafka.EmergencyEventPublisher;
import com.utm.emergency.mapper.EmergencyIncidentMapper;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.IncidentTimelineEntry;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.model.enumeration.OperationMode;
import com.utm.emergency.repository.EmergencyIncidentRepository;
import com.utm.emergency.service.client.AlertClientService;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentPostVm;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentVm;
import com.utm.emergency.viewmodel.incident.IncidentPageVm;
import com.utm.emergency.viewmodel.incident.RootCauseVm;
import com.utm.emergency.viewmodel.stats.EmergencyStatsVm;
import com.utm.emergency.viewmodel.stats.EmergencyTrendVm;
import jakarta.persistence.criteria.Predicate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@Slf4j
public class EmergencyIncidentServiceImpl implements EmergencyIncidentService {

    public static final List<IncidentStatus> OPEN_STATUSES = List.of(
            IncidentStatus.ACTIVE,
            IncidentStatus.PENDING_CONFIRMATION,
            IncidentStatus.EXECUTING,
            IncidentStatus.ESCALATED);

    private final EmergencyIncidentRepository incidentRepo;
    private final EmergencyIncidentMapper incidentMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final DecisionEngineService decisionEngine;
    private final AlertClientService alertClient;
    private final EmergencyEventPublisher emergencyEventPublisher;

    public EmergencyIncidentServiceImpl(
            EmergencyIncidentRepository incidentRepo,
            EmergencyIncidentMapper incidentMapper,
            SimpMessagingTemplate messagingTemplate,
            DecisionEngineService decisionEngine,
            AlertClientService alertClient) {
        this(incidentRepo, incidentMapper, messagingTemplate, decisionEngine, alertClient, null);
    }

    @Autowired
    public EmergencyIncidentServiceImpl(
            EmergencyIncidentRepository incidentRepo,
            EmergencyIncidentMapper incidentMapper,
            SimpMessagingTemplate messagingTemplate,
            DecisionEngineService decisionEngine,
            AlertClientService alertClient,
            @Autowired(required = false) EmergencyEventPublisher emergencyEventPublisher) {
        this.incidentRepo = incidentRepo;
        this.incidentMapper = incidentMapper;
        this.messagingTemplate = messagingTemplate;
        this.decisionEngine = decisionEngine;
        this.alertClient = alertClient;
        this.emergencyEventPublisher = emergencyEventPublisher;
    }

    @Override
    @Transactional
    public EmergencyIncidentVm createIncident(EmergencyIncidentPostVm postVm, String reportedBy) {
        String droneId = postVm.droneId().trim();
        var existingOpen = incidentRepo.findFirstByDroneIdAndEmergencyTypeAndStatusInOrderByDetectedAtDesc(
                droneId, postVm.emergencyType(), OPEN_STATUSES);
        if (existingOpen.isPresent()) {
            throw new DuplicatedException(
                    MessageCode.EMERGENCY_INCIDENT_ALREADY_ACTIVE,
                    "droneId", droneId,
                    "emergencyType", postVm.emergencyType().getValue(),
                    "incidentId", existingOpen.get().getId());
        }

        String incidentNumber;
        if (postVm.incidentNumber() == null || postVm.incidentNumber().trim().isBlank()) {
            incidentNumber = BusinessCodeGenerator.generateUnique(
                    CodePatternRule.EMERGENCY_INCIDENT,
                    incidentRepo::existsByIncidentNumber);
        } else {
            incidentNumber = postVm.incidentNumber().trim().toUpperCase();
            if (incidentRepo.existsByIncidentNumber(incidentNumber)) {
                throw new DuplicatedException(MessageCode.INCIDENT_NUMBER_ALREADY_EXISTED, "incidentNumber",
                        incidentNumber);
            }
        }

        EmergencyIncident entity = incidentMapper.toEntity(postVm);
        entity.setDroneId(droneId);
        if (entity.getFlightId() != null && entity.getFlightId().isBlank()) {
            entity.setFlightId(null);
        }
        entity.setIncidentNumber(incidentNumber);
        entity.setStatus(decisionEngine.getMode() == OperationMode.SUPERVISED
                ? IncidentStatus.PENDING_CONFIRMATION
                : IncidentStatus.ACTIVE);
        entity.setCreatedBy(reportedBy != null && !reportedBy.isBlank() ? reportedBy : "system");

        EmergencyIncident saved = incidentRepo.save(entity);
        log.warn("Emergency incident reported: id={}, incidentNumber={}, type={}, severity={}, drone={}, flight={}",
                saved.getId(), saved.getIncidentNumber(), saved.getEmergencyType(), saved.getSeverity(),
                saved.getDroneId(), saved.getFlightId());

        decisionEngine.processEmergency(saved);

        return incidentMapper.toVm(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public IncidentPageVm searchIncidents(String status, EmergencySeverity severity, EmergencyType type, String droneId,
            ZonedDateTime from, ZonedDateTime to, int limit, int offset) {
        int pageLimit = limit > 0 ? limit : 50;
        int pageNumber = offset >= 0 ? offset / pageLimit : 0;

        Specification<EmergencyIncident> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null && !status.isBlank()) {
                List<IncidentStatus> statuses = Arrays.stream(status.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .map(IncidentStatus::fromValue)
                        .filter(Objects::nonNull)
                        .toList();
                if (!statuses.isEmpty()) {
                    predicates.add(root.get("status").in(statuses));
                }
            }
            if (severity != null) {
                predicates.add(cb.equal(root.get("severity"), severity));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("emergencyType"), type));
            }
            if (droneId != null && !droneId.isBlank()) {
                predicates.add(cb.equal(root.get("droneId"), droneId));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("detectedAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("detectedAt"), to));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<EmergencyIncident> page = incidentRepo.findAll(spec,
                PageRequest.of(pageNumber, pageLimit, Sort.by(Sort.Direction.DESC, "detectedAt")));
        return new IncidentPageVm(incidentMapper.toVmList(page.getContent()), page.getTotalElements(), pageLimit,
                offset);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmergencyIncidentVm> getActiveIncidents() {
        return incidentMapper.toVmList(incidentRepo.findByStatusInOrderByDetectedAtDesc(OPEN_STATUSES));
    }

    @Override
    @Transactional(readOnly = true)
    public EmergencyIncidentVm getIncidentById(String id) {
        EmergencyIncident incident = incidentRepo.findById(id)
                .or(() -> incidentRepo.findByIncidentNumber(id))
                .orElseThrow(() -> new NotFoundException(MessageCode.EMERGENCY_INCIDENT_NOT_FOUND, "id", id));
        return incidentMapper.toVm(incident);
    }

    @Override
    @Transactional
    public EmergencyIncidentVm resolveIncident(String id, String resolvedBy, String resolutionNotes) {
        EmergencyIncident incident = incidentRepo.findById(id)
                .or(() -> incidentRepo.findByIncidentNumber(id))
                .orElseThrow(() -> new NotFoundException(MessageCode.EMERGENCY_INCIDENT_NOT_FOUND, "id", id));

        if (incident.getStatus() == IncidentStatus.RESOLVED || incident.getStatus() == IncidentStatus.REJECTED) {
            throw new BadRequestException(MessageCode.EMERGENCY_INCIDENT_ALREADY_RESOLVED, "id", incident.getId());
        }

        decisionEngine.cancelPendingConfirmation(incident.getId());

        String actor = (resolvedBy != null && !resolvedBy.isBlank()) ? resolvedBy.trim() : "operator";
        String notes = (resolutionNotes != null && !resolutionNotes.isBlank())
                ? resolutionNotes.trim()
                : "Manually resolved by operator";

        incident.setStatus(IncidentStatus.RESOLVED);
        incident.setResolvedAt(ZonedDateTime.now());
        incident.setResolvedBy(actor);
        incident.setResolutionNotes(notes);
        List<IncidentTimelineEntry> timeline = incident.getTimeline() != null
                ? new ArrayList<>(incident.getTimeline())
                : new ArrayList<>();
        timeline.add(new IncidentTimelineEntry(
                ZonedDateTime.now().toString(),
                "incident_resolved",
                Map.of("resolvedBy", actor, "notes", notes)));
        incident.setTimeline(timeline);

        EmergencyIncident saved = incidentRepo.save(incident);
        EmergencyIncidentVm vm = incidentMapper.toVm(saved);
        if (emergencyEventPublisher != null) {
            emergencyEventPublisher.publishStateEvent(EmergencyStateEvent.INCIDENT_RESOLVED, saved);
        }
        broadcastIncidentAfterCommit(vm, saved.getDroneId(), saved.getFlightId());
        if (alertClient != null) {
            alertClient.resolveAlertsByIncident(saved.getId(), notes);
        }
        return vm;
    }

    @Override
    @Transactional
    public EmergencyIncidentVm updateRootCause(String id, RootCauseVm rootCauseVm) {
        EmergencyIncident incident = incidentRepo.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.EMERGENCY_INCIDENT_NOT_FOUND, "id", id));
        incidentMapper.updateEntityFromRootCauseVm(incident, rootCauseVm);
        EmergencyIncident saved = incidentRepo.save(incident);
        EmergencyIncidentVm vm = incidentMapper.toVm(saved);
        broadcastIncidentAfterCommit(vm, saved.getDroneId(), saved.getFlightId());
        return vm;
    }

    @Override
    @Transactional(readOnly = true)
    public EmergencyStatsVm getStats(ZonedDateTime from, ZonedDateTime to) {
        ZonedDateTime start = from != null ? from : ZonedDateTime.of(1970, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);
        ZonedDateTime end = to != null ? to : ZonedDateTime.now();

        var statusCounts = incidentRepo.countByStatusGrouped(start, end).stream()
                .map(row -> new EmergencyStatsVm.StatusCountVm(
                        row[0] instanceof IncidentStatus s ? s.getValue() : String.valueOf(row[0]),
                        (Long) row[1]))
                .toList();

        var typeCounts = incidentRepo.countByTypeGrouped(start, end).stream()
                .map(row -> new EmergencyStatsVm.TypeCountVm(
                        row[0] instanceof EmergencyType t ? t.getValue() : String.valueOf(row[0]),
                        (Long) row[1]))
                .toList();

        var severityCounts = incidentRepo.countBySeverityGrouped(start, end).stream()
                .map(row -> new EmergencyStatsVm.SeverityCountVm(
                        row[0] instanceof EmergencySeverity sv ? sv.getValue() : String.valueOf(row[0]),
                        (Long) row[1]))
                .toList();

        var droneCounts = incidentRepo.countByDroneGrouped(start, end).stream()
                .map(row -> new EmergencyStatsVm.DroneCountVm(String.valueOf(row[0]), (Long) row[1]))
                .limit(10)
                .toList();

        var resolutionCounts = incidentRepo.countByResolutionGrouped(start, end).stream()
                .map(row -> new EmergencyStatsVm.ResolutionStatVm((Boolean) row[0], (Long) row[1]))
                .toList();

        Double rawAvgResponse = incidentRepo.calculateAvgResponseTimeSeconds(start, end);
        double avgResponseTimeSeconds = rawAvgResponse != null ? Math.round(rawAvgResponse * 100.0) / 100.0 : 0.0;

        return new EmergencyStatsVm(statusCounts, typeCounts, severityCounts, droneCounts, avgResponseTimeSeconds,
                resolutionCounts);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmergencyTrendVm> getTrends(ZonedDateTime from, ZonedDateTime to, String interval) {
        ZonedDateTime start = from != null ? from : ZonedDateTime.now().minusDays(30);
        ZonedDateTime end = to != null ? to : ZonedDateTime.now();

        Specification<EmergencyIncident> spec = (root, query, cb) -> cb.between(root.get("detectedAt"), start, end);
        List<EmergencyIncident> incidents = incidentRepo.findAll(spec, Sort.by(Sort.Direction.ASC, "detectedAt"));

        DateTimeFormatter formatter = "month".equalsIgnoreCase(interval)
                ? DateTimeFormatter.ofPattern("yyyy-MM")
                : "week".equalsIgnoreCase(interval)
                        ? DateTimeFormatter.ofPattern("yyyy-'W'w")
                        : DateTimeFormatter.ofPattern("yyyy-MM-dd");

        Map<String, List<EmergencyIncident>> grouped = new LinkedHashMap<>();
        for (var inc : incidents) {
            String key = inc.getDetectedAt().format(formatter);
            grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(inc);
        }

        return grouped.entrySet().stream()
                .map(entry -> {
                    long warnings = entry.getValue().stream().filter(i -> i.getSeverity() == EmergencySeverity.WARNING)
                            .count();
                    long critical = entry.getValue().stream().filter(i -> i.getSeverity() == EmergencySeverity.CRITICAL)
                            .count();
                    long emergencies = entry.getValue().stream()
                            .filter(i -> i.getSeverity() == EmergencySeverity.EMERGENCY).count();
                    return new EmergencyTrendVm(entry.getKey(), entry.getValue().size(), warnings, critical,
                            emergencies);
                })
                .toList();
    }

    private void broadcastIncidentAfterCommit(EmergencyIncidentVm vm, String droneId, String flightId) {
        Runnable sendTask = () -> {
            messagingTemplate.convertAndSend("/topic/emergency/incidents", vm);
            if (droneId != null && !droneId.isBlank()) {
                messagingTemplate.convertAndSend("/topic/emergency/drone/" + droneId, vm);
            }
            if (flightId != null && !flightId.isBlank()) {
                messagingTemplate.convertAndSend("/topic/emergency/flight/" + flightId, vm);
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
