package com.utm.alert.service;

import com.utm.alert.mapper.AlertMapper;
import com.utm.alert.model.Alert;
import com.utm.alert.model.enumeration.AlertSeverity;
import com.utm.alert.model.enumeration.AlertStatus;
import com.utm.alert.repository.AlertRepository;
import com.utm.alert.viewmodel.AlertAcknowledgePostVm;
import com.utm.alert.viewmodel.AlertListVm;
import com.utm.alert.viewmodel.AlertPostVm;
import com.utm.alert.viewmodel.AlertResolvePostVm;
import com.utm.alert.viewmodel.AlertVm;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.NotFoundException;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertServiceImpl implements AlertService {

    private final AlertRepository alertRepository;
    private final AlertMapper alertMapper;

    @Override
    @Transactional
    public AlertVm createAlert(AlertPostVm postVm) {
        AlertSeverity severity = postVm.severity() != null && !postVm.severity().isBlank()
                ? AlertSeverity.fromValue(postVm.severity())
                : AlertSeverity.HIGH;

        Alert alert = alertMapper.toEntity(postVm);
        alert.setSeverity(severity);
        alert.setStatus(AlertStatus.ACTIVE);
        alert.setAcknowledged(false);
        alert.setResolved(false);

        String creator = getCurrentUserSafely(null);
        if (alert.getCreatedBy() == null || alert.getCreatedBy().isBlank()) {
            alert.setCreatedBy(creator);
        }

        Alert savedAlert = alertRepository.save(alert);
        log.warn("Created operational alert [{}] for flight '{}', drone '{}', severity '{}': {}",
                savedAlert.getAlertType(), savedAlert.getFlightId(), savedAlert.getDroneId(),
                savedAlert.getSeverity(), savedAlert.getMessage());

        return alertMapper.toVm(savedAlert);
    }

    @Override
    @Transactional(readOnly = true)
    public AlertVm getAlertById(String id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.ALERT_NOT_FOUND, id));
        return alertMapper.toVm(alert);
    }

    @Override
    @Transactional(readOnly = true)
    public AlertListVm getAlerts(
            String droneId,
            String flightId,
            String severity,
            Boolean acknowledged,
            Boolean resolved,
            String alertType,
            int pageNo,
            int pageSize
    ) {
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
            if (acknowledged != null) {
                predicates.add(cb.equal(root.get("acknowledged"), acknowledged));
            }
            if (resolved != null) {
                predicates.add(cb.equal(root.get("resolved"), resolved));
            }
            if (alertType != null && !alertType.isBlank()) {
                predicates.add(cb.equal(root.get("alertType"), alertType.trim()));
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
                page.isLast()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlertVm> getActiveAlerts() {
        return alertMapper.toVmList(alertRepository.findByResolvedFalseOrderByCreatedOnDesc());
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
                .orElseThrow(() -> new NotFoundException(MessageCode.ALERT_NOT_FOUND, id));

        alert.setAcknowledged(true);
        alert.setAcknowledgedAt(ZonedDateTime.now());

        String operator = (acknowledgeVm != null && acknowledgeVm.acknowledgedBy() != null && !acknowledgeVm.acknowledgedBy().isBlank())
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
        return alertMapper.toVm(updated);
    }

    @Override
    @Transactional
    public AlertVm resolveAlert(String id, AlertResolvePostVm resolveVm) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.ALERT_NOT_FOUND, id));

        alert.setResolved(true);
        alert.setResolvedAt(ZonedDateTime.now());
        alert.setStatus(AlertStatus.RESOLVED);

        String operator = (resolveVm != null && resolveVm.resolvedBy() != null && !resolveVm.resolvedBy().isBlank())
                ? resolveVm.resolvedBy().trim()
                : getCurrentUserSafely(null);
        alert.setResolvedBy(operator);

        if (resolveVm != null && resolveVm.resolutionNotes() != null && !resolveVm.resolutionNotes().isBlank()) {
            String existingNotes = alert.getResolutionNotes() != null ? alert.getResolutionNotes() + "\n" : "";
            alert.setResolutionNotes(existingNotes + "[Resolution by " + operator + "]: " + resolveVm.resolutionNotes().trim());
        }

        Alert updated = alertRepository.save(alert);
        log.info("Alert '{}' marked as RESOLVED by operator '{}'", id, operator);
        return alertMapper.toVm(updated);
    }

    private String getCurrentUserSafely(String explicitUser) {
        if (explicitUser != null && !explicitUser.isBlank()) {
            return explicitUser.trim();
        }
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                String preferredUsername = jwtAuth.getToken().getClaimAsString("preferred_username");
                if (preferredUsername != null && !preferredUsername.isBlank()) {
                    return preferredUsername;
                }
                return jwtAuth.getToken().getSubject();
            } else if (auth != null && auth.getName() != null && !auth.getName().isBlank()) {
                return auth.getName();
            }
        } catch (Exception ignored) {
        }
        return "SYSTEM";
    }
}
