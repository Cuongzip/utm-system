package com.utm.emergency.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.generator.BusinessCodeGenerator;
import com.utm.commonlibrary.generator.CodePatternRule;
import com.utm.emergency.mapper.EmergencyIncidentMapper;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.model.enumeration.OperationMode;
import com.utm.emergency.repository.EmergencyIncidentRepository;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentPostVm;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentVm;
import com.utm.emergency.viewmodel.incident.IncidentPageVm;
import com.utm.emergency.viewmodel.incident.RootCauseVm;
import com.utm.emergency.viewmodel.stats.EmergencyStatsVm;
import com.utm.emergency.viewmodel.stats.EmergencyTrendVm;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
@RequiredArgsConstructor
@Slf4j
public class EmergencyIncidentServiceImpl implements EmergencyIncidentService {

    private final EmergencyIncidentRepository incidentRepo;
    private final EmergencyIncidentMapper incidentMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final DecisionEngineService decisionEngine;

    @Override
    @Transactional
    public EmergencyIncidentVm createIncident(EmergencyIncidentPostVm postVm, String reportedBy) {
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
        entity.setIncidentNumber(incidentNumber);
        entity.setStatus(decisionEngine.getMode() == OperationMode.supervised
                ? IncidentStatus.pending_confirmation
                : IncidentStatus.active);
        entity.setCreatedBy(reportedBy != null && !reportedBy.isBlank() ? reportedBy : "system");

        EmergencyIncident saved = incidentRepo.save(entity);
        log.warn("Emergency incident reported: id={}, incidentNumber={}, type={}, severity={}, drone={}, flight={}",
                saved.getId(), saved.getIncidentNumber(), saved.getEmergencyType(), saved.getSeverity(),
                saved.getDroneId(), saved.getFlightId());

        decisionEngine.processEmergency(saved);

        EmergencyIncidentVm vm = incidentMapper.toVm(saved);
        messagingTemplate.convertAndSend("/topic/emergency/incidents", vm);
        if (saved.getDroneId() != null && !saved.getDroneId().isBlank()) {
            messagingTemplate.convertAndSend("/topic/emergency/drone/" + saved.getDroneId(), vm);
        }
        if (saved.getFlightId() != null && !saved.getFlightId().isBlank()) {
            messagingTemplate.convertAndSend("/topic/emergency/flight/" + saved.getFlightId(), vm);
        }
        return vm;
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
                        .map(s -> {
                            try {
                                return IncidentStatus.valueOf(s);
                            } catch (IllegalArgumentException e) {
                                return null;
                            }
                        })
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
        List<IncidentStatus> activeStatuses = List.of(IncidentStatus.active, IncidentStatus.pending_confirmation,
                IncidentStatus.executing);
        return incidentMapper.toVmList(incidentRepo.findByStatusInOrderByDetectedAtDesc(activeStatuses));
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
    public EmergencyIncidentVm updateRootCause(String id, RootCauseVm rootCauseVm) {
        EmergencyIncident incident = incidentRepo.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.EMERGENCY_INCIDENT_NOT_FOUND, "id", id));
        incidentMapper.updateEntityFromRootCauseVm(incident, rootCauseVm);
        EmergencyIncident saved = incidentRepo.save(incident);
        EmergencyIncidentVm vm = incidentMapper.toVm(saved);
        messagingTemplate.convertAndSend("/topic/emergency/incidents", vm);
        if (saved.getDroneId() != null && !saved.getDroneId().isBlank()) {
            messagingTemplate.convertAndSend("/topic/emergency/drone/" + saved.getDroneId(), vm);
        }
        if (saved.getFlightId() != null && !saved.getFlightId().isBlank()) {
            messagingTemplate.convertAndSend("/topic/emergency/flight/" + saved.getFlightId(), vm);
        }
        return vm;
    }

    @Override
    @Transactional(readOnly = true)
    public EmergencyStatsVm getStats(ZonedDateTime from, ZonedDateTime to) {
        ZonedDateTime start = from != null ? from : ZonedDateTime.of(1970, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);
        ZonedDateTime end = to != null ? to : ZonedDateTime.now();

        var statusCounts = incidentRepo.countByStatusGrouped(start, end).stream()
                .map(row -> new EmergencyStatsVm.StatusCountVm(String.valueOf(row[0]), (Long) row[1]))
                .toList();

        var typeCounts = incidentRepo.countByTypeGrouped(start, end).stream()
                .map(row -> new EmergencyStatsVm.TypeCountVm(String.valueOf(row[0]), (Long) row[1]))
                .toList();

        var severityCounts = incidentRepo.countBySeverityGrouped(start, end).stream()
                .map(row -> new EmergencyStatsVm.SeverityCountVm(String.valueOf(row[0]), (Long) row[1]))
                .toList();

        var droneCounts = incidentRepo.countByDroneGrouped(start, end).stream()
                .map(row -> new EmergencyStatsVm.DroneCountVm(String.valueOf(row[0]), (Long) row[1]))
                .limit(10)
                .toList();

        var resolutionCounts = incidentRepo.countByResolutionGrouped(start, end).stream()
                .map(row -> new EmergencyStatsVm.ResolutionStatVm((Boolean) row[0], (Long) row[1]))
                .toList();

        return new EmergencyStatsVm(statusCounts, typeCounts, severityCounts, droneCounts, 2.4, resolutionCounts);
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
                    long warnings = entry.getValue().stream().filter(i -> i.getSeverity() == EmergencySeverity.warning)
                            .count();
                    long critical = entry.getValue().stream().filter(i -> i.getSeverity() == EmergencySeverity.critical)
                            .count();
                    long emergencies = entry.getValue().stream()
                            .filter(i -> i.getSeverity() == EmergencySeverity.emergency).count();
                    return new EmergencyTrendVm(entry.getKey(), entry.getValue().size(), warnings, critical,
                            emergencies);
                })
                .toList();
    }
}