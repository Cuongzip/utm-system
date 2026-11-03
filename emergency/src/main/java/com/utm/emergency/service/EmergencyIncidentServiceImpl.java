package com.utm.emergency.service;

import com.utm.emergency.mapper.EmergencyIncidentMapper;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.repository.EmergencyIncidentRepository;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentVm;
import com.utm.emergency.viewmodel.incident.IncidentPageVm;
import com.utm.emergency.viewmodel.incident.RootCauseVm;
import com.utm.emergency.viewmodel.stats.EmergencyStatsVm;
import com.utm.emergency.viewmodel.stats.EmergencyTrendVm;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
public class EmergencyIncidentServiceImpl implements EmergencyIncidentService {

    private final EmergencyIncidentRepository incidentRepo;
    private final EmergencyIncidentMapper incidentMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional(readOnly = true)
    public IncidentPageVm searchIncidents(String status, EmergencySeverity severity, EmergencyType type, String droneId, ZonedDateTime from, ZonedDateTime to, int limit, int offset) {
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

        Page<EmergencyIncident> page = incidentRepo.findAll(spec, PageRequest.of(pageNumber, pageLimit, Sort.by(Sort.Direction.DESC, "detectedAt")));
        return new IncidentPageVm(incidentMapper.toVmList(page.getContent()), page.getTotalElements(), pageLimit, offset);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmergencyIncidentVm> getActiveIncidents() {
        List<IncidentStatus> activeStatuses = List.of(IncidentStatus.active, IncidentStatus.pending_confirmation, IncidentStatus.executing);
        return incidentMapper.toVmList(incidentRepo.findByStatusInOrderByDetectedAtDesc(activeStatuses));
    }

    @Override
    @Transactional(readOnly = true)
    public EmergencyIncidentVm getIncidentById(String id) {
        EmergencyIncident incident = incidentRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Incident not found: " + id));
        return incidentMapper.toVm(incident);
    }

    @Override
    @Transactional
    public EmergencyIncidentVm updateRootCause(String id, RootCauseVm rootCauseVm) {
        EmergencyIncident incident = incidentRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Incident not found: " + id));
        incident.setRootCause(rootCauseVm.rootCause());
        if (rootCauseVm.notes() != null) incident.setRootCauseNotes(rootCauseVm.notes());
        if (rootCauseVm.lessonsLearned() != null) incident.setLessonsLearned(rootCauseVm.lessonsLearned());
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
        var statusCounts = incidentRepo.countByStatusGrouped(from, to).stream()
                .map(row -> new EmergencyStatsVm.StatusCountVm(String.valueOf(row[0]), (Long) row[1]))
                .toList();

        var typeCounts = incidentRepo.countByTypeGrouped(from, to).stream()
                .map(row -> new EmergencyStatsVm.TypeCountVm(String.valueOf(row[0]), (Long) row[1]))
                .toList();

        var severityCounts = incidentRepo.countBySeverityGrouped(from, to).stream()
                .map(row -> new EmergencyStatsVm.SeverityCountVm(String.valueOf(row[0]), (Long) row[1]))
                .toList();

        var droneCounts = incidentRepo.countByDroneGrouped(from, to).stream()
                .map(row -> new EmergencyStatsVm.DroneCountVm(String.valueOf(row[0]), (Long) row[1]))
                .limit(10)
                .toList();

        var resolutionCounts = incidentRepo.countByResolutionGrouped(from, to).stream()
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
                    long warnings = entry.getValue().stream().filter(i -> i.getSeverity() == EmergencySeverity.warning).count();
                    long critical = entry.getValue().stream().filter(i -> i.getSeverity() == EmergencySeverity.critical).count();
                    long emergencies = entry.getValue().stream().filter(i -> i.getSeverity() == EmergencySeverity.emergency).count();
                    return new EmergencyTrendVm(entry.getKey(), entry.getValue().size(), warnings, critical, emergencies);
                })
                .toList();
    }
}