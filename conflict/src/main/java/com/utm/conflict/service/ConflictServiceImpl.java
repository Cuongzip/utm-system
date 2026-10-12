package com.utm.conflict.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.conflict.mapper.ConflictMapper;
import com.utm.conflict.model.Conflict;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.model.enumeration.ConflictStatus;
import com.utm.conflict.model.enumeration.ResolutionStrategy;
import com.utm.conflict.repository.ConflictRepository;
import com.utm.conflict.model.enumeration.ConflictType;
import com.utm.conflict.viewmodel.ConflictPostVm;
import com.utm.conflict.viewmodel.ConflictResolvePostVm;
import com.utm.conflict.viewmodel.ConflictVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ConflictServiceImpl implements ConflictService {

    private static final List<ConflictStatus> ACTIVE_STATUSES = List.of(
            ConflictStatus.DETECTED,
            ConflictStatus.NOTIFIED,
            ConflictStatus.ACKNOWLEDGED,
            ConflictStatus.RESOLVING
    );

    private final ConflictRepository conflictRepository;
    private final ConflictMapper conflictMapper;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public List<ConflictVm> getAllConflicts(String status, String severity, String flightId) {
        if (status == null && severity == null && flightId == null) {
            return conflictMapper.toVmList(conflictRepository.findAllByOrderByDetectedAtDesc());
        }
        ConflictStatus statusEnum = status != null ? ConflictStatus.fromValue(status) : null;
        ConflictSeverity severityEnum = severity != null ? ConflictSeverity.fromValue(severity) : null;
        return conflictMapper.toVmList(conflictRepository.searchConflicts(statusEnum, severityEnum, flightId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConflictVm> getActiveConflicts() {
        return conflictMapper.toVmList(conflictRepository.findActivePrioritized(ACTIVE_STATUSES));
    }

    @Override
    @Transactional(readOnly = true)
    public ConflictVm getConflictById(String id) {
        Conflict conflict = conflictRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.CONFLICT_NOT_FOUND, id));
        return conflictMapper.toVm(conflict);
    }

    @Override
    public ConflictVm createConflict(ConflictPostVm postVm, String createdBy) {
        ConflictType typeEnum = ConflictType.fromValue(postVm.conflictType());
        if (typeEnum == null) {
            typeEnum = ConflictType.GEOFENCE_VIOLATION;
        }

        List<Conflict> existingActive = conflictRepository.findByPrimaryFlightIdAndStatusIn(
                postVm.primaryFlightId(), ACTIVE_STATUSES);

        ConflictType finalTypeEnum = typeEnum;
        Optional<Conflict> matched = existingActive.stream()
                .filter(c -> c.getConflictType() == finalTypeEnum)
                .findFirst();

        if (matched.isPresent()) {
            Conflict existing = matched.get();
            if (postVm.locationLat() != null) existing.setLocationLat(postVm.locationLat());
            if (postVm.locationLon() != null) existing.setLocationLon(postVm.locationLon());
            if (postVm.altitude() != null) existing.setAltitude(postVm.altitude());
            if (postVm.separationDistance() != null) existing.setSeparationDistance(postVm.separationDistance());
            if (postVm.verticalSeparation() != null) existing.setVerticalSeparation(postVm.verticalSeparation());
            if (postVm.timeToConflictSec() != null) existing.setTimeToConflictSec(postVm.timeToConflictSec());
            if (postVm.severity() != null) {
                ConflictSeverity sev = ConflictSeverity.fromValue(postVm.severity());
                if (sev != null) existing.setSeverity(sev);
            }
            if (postVm.description() != null && !postVm.description().isBlank()) {
                existing.setDescription(postVm.description());
            }
            if (postVm.hubId() != null && existing.getHubId() == null) {
                existing.setHubId(postVm.hubId());
            }
            Conflict saved = conflictRepository.save(existing);
            log.info("Updated existing active conflict {} ({}) for flight {}", saved.getId(), saved.getConflictType(), saved.getPrimaryFlightId());
            return conflictMapper.toVm(saved);
        }

        Conflict entity = conflictMapper.toEntity(postVm, createdBy != null && !createdBy.isBlank() ? createdBy : "system");
        Conflict saved = conflictRepository.save(entity);
        log.warn("Created new conflict {} [{}-{}] for flight {}", saved.getId(), saved.getConflictType(), saved.getSeverity(), saved.getPrimaryFlightId());
        return conflictMapper.toVm(saved);
    }

    @Override
    public ConflictVm acknowledgeConflict(String id, String acknowledgedBy) {
        Conflict conflict = conflictRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.CONFLICT_NOT_FOUND, id));

        if (conflict.getStatus() == ConflictStatus.DETECTED || conflict.getStatus() == ConflictStatus.NOTIFIED) {
            conflict.setStatus(ConflictStatus.ACKNOWLEDGED);
            log.info("Conflict {} acknowledged by {}", id, acknowledgedBy != null ? acknowledgedBy : "operator");
        }
        Conflict saved = conflictRepository.save(conflict);
        return conflictMapper.toVm(saved);
    }

    @Override
    public ConflictVm resolveConflict(String id, ConflictResolvePostVm resolveVm, String resolvedBy) {
        Conflict conflict = conflictRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.CONFLICT_NOT_FOUND, id));

        String actionsJson;
        try {
            actionsJson = objectMapper.writeValueAsString(resolveVm.actions());
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize resolution actions for conflict {}: {}", id, e.getMessage());
            actionsJson = String.valueOf(resolveVm.actions());
        }

        conflict.setStatus(ConflictStatus.RESOLVED);
        conflict.setResolutionStrategy(ResolutionStrategy.fromValue(resolveVm.strategy()));
        conflict.setResolutionActions(actionsJson);
        conflict.setResolvedAt(ZonedDateTime.now());
        conflict.setResolvedBy(resolvedBy != null && !resolvedBy.isBlank() ? resolvedBy : "operator");

        Conflict saved = conflictRepository.save(conflict);
        log.info("Conflict {} successfully marked as resolved by {} with strategy {}", id, conflict.getResolvedBy(), conflict.getResolutionStrategy());
        return conflictMapper.toVm(saved);
    }
}
