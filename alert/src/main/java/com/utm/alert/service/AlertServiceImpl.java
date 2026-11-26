package com.utm.alert.service;

import com.utm.alert.mapper.AlertMapper;
import com.utm.alert.model.Alert;
import com.utm.alert.model.enumeration.AlertSeverity;
import com.utm.alert.model.enumeration.AlertStatus;
import com.utm.alert.model.enumeration.AlertType;
import com.utm.alert.repository.AlertRepository;
import com.utm.alert.viewmodel.alert.AlertAcknowledgePostVm;
import com.utm.alert.viewmodel.alert.AlertListVm;
import com.utm.alert.viewmodel.alert.AlertPostVm;
import com.utm.alert.viewmodel.alert.AlertResolvePostVm;
import com.utm.alert.viewmodel.alert.AlertVm;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import com.utm.commonlibrary.utils.AuthenticationUtils;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertServiceImpl implements AlertService {

    private static final List<AlertStatus> OPEN_STATUSES = List.of(AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED);

    private final AlertRepository alertRepository;
    private final AlertMapper alertMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public AlertVm createAlert(AlertPostVm postVm) {
        AlertSeverity severity = postVm.severity() != null && !postVm.severity().isBlank()
                ? AlertSeverity.fromValue(postVm.severity())
                : AlertSeverity.HIGH;
        AlertType alertType = AlertType.fromValue(postVm.alertType());
        String cleanFlightId = trimBlankToNull(postVm.flightId());
        String cleanDroneId = trimBlankToNull(postVm.droneId());
        String cleanConflictId = trimBlankToNull(postVm.conflictId());
        String cleanIncidentId = trimBlankToNull(postVm.incidentId());

        Optional<Alert> existingOpen = findExistingOpenAlert(alertType, cleanFlightId, cleanDroneId, cleanConflictId,
                cleanIncidentId);
        if (existingOpen.isPresent()) {
            Alert existing = existingOpen.get();
            existing.setMessage(postVm.message());
            if (alertType != null && alertType != AlertType.OTHER) {
                existing.setAlertType(alertType);
            }
            if (severity != null && (existing.getSeverity() == null
                    || severity.ordinal() > existing.getSeverity().ordinal())) {
                existing.setSeverity(severity);
            }
            if (postVm.detailsJson() != null) {
                existing.setDetailsJson(postVm.detailsJson());
            }
            Alert updated = alertRepository.save(existing);
            AlertVm vm = alertMapper.toVm(updated);
            broadcastAlert(vm);
            return vm;
        }

        Alert alert = alertMapper.toEntity(postVm);
        alert.setAlertType(alertType);
        alert.setSeverity(severity);
        alert.setStatus(AlertStatus.ACTIVE);

        String creator = getCurrentUserSafely(null);
        if (alert.getCreatedBy() == null || alert.getCreatedBy().isBlank()) {
            alert.setCreatedBy(creator);
        }

        Alert savedAlert = alertRepository.save(alert);
        log.warn("Created operational alert [{}] for flight '{}', drone '{}', severity '{}': {}",
                savedAlert.getAlertType(), savedAlert.getFlightId(), savedAlert.getDroneId(),
                savedAlert.getSeverity(), savedAlert.getMessage());

        AlertVm vm = alertMapper.toVm(savedAlert);
        broadcastAlert(vm);
        return vm;
    }

    private Optional<Alert> findExistingOpenAlert(
            AlertType alertType,
            String flightId,
            String droneId,
            String conflictId,
            String incidentId) {
        if (conflictId != null) {
            List<Alert> byConflict = alertRepository.findByConflictIdAndStatusIn(conflictId, OPEN_STATUSES);
            if (!byConflict.isEmpty()) {
                return Optional.of(byConflict.getFirst());
            }
        }
        if (incidentId != null) {
            List<Alert> byIncident = alertRepository.findByIncidentIdAndStatusIn(incidentId, OPEN_STATUSES);
            if (!byIncident.isEmpty()) {
                return Optional.of(byIncident.getFirst());
            }
        }
        if (flightId != null || droneId != null) {
            return alertRepository.findFirstByAlertTypeAndFlightIdAndDroneIdAndStatusInOrderByCreatedOnDesc(
                    alertType, flightId, droneId, OPEN_STATUSES);
        }
        return Optional.empty();
    }

    @Override
    @Transactional(readOnly = true)
    public AlertVm getAlertById(String id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.ALERT_NOT_FOUND, "id", id));
        return alertMapper.toVm(alert);
    }

    @Override
    @Transactional(readOnly = true)
    public AlertListVm getAlerts(
            String droneId,
            String flightId,
            String severity,
            String status,
            Boolean acknowledged,
            Boolean resolved,
            String alertType,
            int pageNo,
            int pageSize) {
        int safePage = Math.max(0, pageNo);
        int safeSize = (pageSize <= 0) ? 20 : Math.min(100, pageSize);
        PageRequest pageRequest = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdOn"));

        Specification<Alert> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (droneId != null && !droneId.isBlank()) {
                predicates.add(cb.equal(root.get("droneId"), droneId.trim()));
            }
            if (flightId != null && !flightId.isBlank()) {
                predicates.add(cb.equal(root.get("flightId"), flightId.trim()));
            }
            if (severity != null && !severity.isBlank()) {
                AlertSeverity sevEnum = AlertSeverity.fromValue(severity);
                predicates.add(cb.equal(root.get("severity"), sevEnum));
            }
            if (status != null && !status.isBlank()) {
                AlertStatus statusEnum = AlertStatus.fromValue(status);
                if (statusEnum != null) {
                    predicates.add(cb.equal(root.get("status"), statusEnum));
                }
            } else {
                if (resolved != null) {
                    predicates.add(resolved
                            ? cb.equal(root.get("status"), AlertStatus.RESOLVED)
                            : cb.notEqual(root.get("status"), AlertStatus.RESOLVED));
                }
                if (acknowledged != null) {
                    predicates.add(acknowledged
                            ? root.get("status").in(AlertStatus.ACKNOWLEDGED, AlertStatus.RESOLVED)
                            : cb.equal(root.get("status"), AlertStatus.ACTIVE));
                }
            }
            if (alertType != null && !alertType.isBlank()) {
                predicates.add(cb.equal(root.get("alertType"), AlertType.fromValue(alertType)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Alert> page = alertRepository.findAll(spec, pageRequest);
        List<AlertVm> content = alertMapper.toVmList(page.getContent());

        return new AlertListVm(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isLast());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlertVm> getActiveAlerts() {
        return alertMapper.toVmList(alertRepository.findByStatusNotOrderByCreatedOnDesc(AlertStatus.RESOLVED));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlertVm> getAlertsByFlight(String flightId) {
        return alertMapper.toVmList(alertRepository.findByFlightIdOrderByCreatedOnDesc(flightId));
    }

    @Override
    @Transactional
    public AlertVm acknowledgeAlert(String id, AlertAcknowledgePostVm acknowledgeVm) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.ALERT_NOT_FOUND, "id", id));

        if (alert.getStatus() == AlertStatus.RESOLVED) {
            throw new BadRequestException(MessageCode.ALERT_ALREADY_RESOLVED, "id", id);
        }

        alert.setAcknowledgedAt(ZonedDateTime.now());

        String operator = (acknowledgeVm != null && acknowledgeVm.acknowledgedBy() != null
                && !acknowledgeVm.acknowledgedBy().isBlank())
                        ? acknowledgeVm.acknowledgedBy().trim()
                        : getCurrentUserSafely(null);
        alert.setAcknowledgedBy(operator);

        if (alert.getStatus() == AlertStatus.ACTIVE) {
            alert.setStatus(AlertStatus.ACKNOWLEDGED);
        }

        if (acknowledgeVm != null && acknowledgeVm.note() != null && !acknowledgeVm.note().isBlank()) {
            String existingNotes = alert.getResolutionNotes() != null ? alert.getResolutionNotes() + "\n" : "";
            alert.setResolutionNotes(existingNotes + "[Ack Note by " + operator + "]: " + acknowledgeVm.note().trim());
        }

        Alert updated = alertRepository.save(alert);
        log.info("Alert '{}' acknowledged by operator '{}'", id, operator);
        AlertVm vm = alertMapper.toVm(updated);
        broadcastAlert(vm);
        return vm;
    }

    @Override
    @Transactional
    public AlertVm resolveAlert(String id, AlertResolvePostVm resolveVm) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.ALERT_NOT_FOUND, "id", id));

        if (alert.getStatus() == AlertStatus.RESOLVED) {
            throw new BadRequestException(MessageCode.ALERT_ALREADY_RESOLVED, "id", id);
        }

        ZonedDateTime now = ZonedDateTime.now();
        alert.setResolvedAt(now);
        alert.setStatus(AlertStatus.RESOLVED);

        String operator = (resolveVm != null && resolveVm.resolvedBy() != null && !resolveVm.resolvedBy().isBlank())
                ? resolveVm.resolvedBy().trim()
                : getCurrentUserSafely(null);
        alert.setResolvedBy(operator);
        if (alert.getAcknowledgedAt() == null) {
            alert.setAcknowledgedAt(now);
            alert.setAcknowledgedBy(operator);
        }

        if (resolveVm != null && resolveVm.resolutionNotes() != null && !resolveVm.resolutionNotes().isBlank()) {
            String existingNotes = alert.getResolutionNotes() != null ? alert.getResolutionNotes() + "\n" : "";
            alert.setResolutionNotes(
                    existingNotes + "[Resolution by " + operator + "]: " + resolveVm.resolutionNotes().trim());
        }

        Alert updated = alertRepository.save(alert);
        log.info("Alert '{}' marked as RESOLVED by operator '{}'", id, operator);
        AlertVm vm = alertMapper.toVm(updated);
        broadcastAlert(vm);
        return vm;
    }

    @Override
    @Transactional
    public int resolveByConflictId(String conflictId, String resolutionNotes) {
        if (conflictId == null || conflictId.isBlank()) {
            return 0;
        }
        List<Alert> openAlerts = alertRepository.findByConflictIdAndStatusIn(conflictId.trim(), OPEN_STATUSES);
        return bulkAutoResolve(openAlerts, resolutionNotes != null ? resolutionNotes : "Linked conflict resolved");
    }

    @Override
    @Transactional
    public int resolveByIncidentId(String incidentId, String resolutionNotes) {
        if (incidentId == null || incidentId.isBlank()) {
            return 0;
        }
        List<Alert> openAlerts = alertRepository.findByIncidentIdAndStatusIn(incidentId.trim(), OPEN_STATUSES);
        return bulkAutoResolve(openAlerts, resolutionNotes != null ? resolutionNotes : "Linked emergency incident resolved");
    }

    private int bulkAutoResolve(List<Alert> openAlerts, String notes) {
        if (openAlerts == null || openAlerts.isEmpty()) {
            return 0;
        }
        String actor = getCurrentUserSafely("SYSTEM_AUTO");
        ZonedDateTime now = ZonedDateTime.now();
        for (Alert alert : openAlerts) {
            alert.setStatus(AlertStatus.RESOLVED);
            alert.setResolvedAt(now);
            alert.setResolvedBy(actor);
            if (alert.getAcknowledgedAt() == null) {
                alert.setAcknowledgedAt(now);
                alert.setAcknowledgedBy(actor);
            }
            String existingNotes = alert.getResolutionNotes() != null ? alert.getResolutionNotes() + "\n" : "";
            alert.setResolutionNotes(existingNotes + "[Auto-Resolved]: " + notes);
            Alert saved = alertRepository.save(alert);
            broadcastAlert(alertMapper.toVm(saved));
        }
        return openAlerts.size();
    }

    private String trimBlankToNull(String value) {
        return (value != null && !value.isBlank()) ? value.trim() : null;
    }

    private void broadcastAlert(AlertVm vm) {
        Runnable sendTask = () -> {
            try {
                messagingTemplate.convertAndSend("/topic/alerts/live", vm);
                if (vm.severity() == AlertSeverity.CRITICAL) {
                    messagingTemplate.convertAndSend("/topic/alerts/critical", vm);
                }
                if (vm.droneId() != null && !vm.droneId().isBlank()) {
                    messagingTemplate.convertAndSend("/topic/alerts/drone/" + vm.droneId(), vm);
                }
                if (vm.flightId() != null && !vm.flightId().isBlank()) {
                    messagingTemplate.convertAndSend("/topic/alerts/flight/" + vm.flightId(), vm);
                }
            } catch (Exception ex) {
                log.error("Failed to broadcast alert via WebSocket: {}", ex.getMessage());
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

    private String getCurrentUserSafely(String explicitUser) {
        if (explicitUser != null && !explicitUser.isBlank()) {
            return explicitUser.trim();
        }
        try {
            return AuthenticationUtils.extractUserId();
        } catch (Exception ex) {
            var auth = AuthenticationUtils.getAuthentication();
            if (auth != null && auth.getName() != null && !auth.getName().isBlank()) {
                return auth.getName();
            }
        }
        return "SYSTEM";
    }
}
