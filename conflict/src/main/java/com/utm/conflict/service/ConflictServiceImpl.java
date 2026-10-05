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
import com.utm.conflict.viewmodel.ConflictResolvePostVm;
import com.utm.conflict.viewmodel.ConflictVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ConflictServiceImpl implements ConflictService {

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
        List<ConflictStatus> activeStatuses = List.of(
                ConflictStatus.DETECTED,
                ConflictStatus.NOTIFIED,
                ConflictStatus.RESOLVING
        );
        return conflictMapper.toVmList(conflictRepository.findByStatusInOrderByDetectedAtDesc(activeStatuses));
    }

    @Override
    @Transactional(readOnly = true)
    public ConflictVm getConflictById(String id) {
        Conflict conflict = conflictRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.CONFLICT_NOT_FOUND, id));
        return conflictMapper.toVm(conflict);
    }

    @Override
    public ConflictVm resolveConflict(String id, ConflictResolvePostVm resolveVm, String resolvedBy) {
        Conflict conflict = conflictRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.CONFLICT_NOT_FOUND, id));

        String actionsJson = null;
        if (resolveVm.actions() != null) {
            try {
                actionsJson = objectMapper.writeValueAsString(resolveVm.actions());
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize resolution actions for conflict {}: {}", id, e.getMessage());
                actionsJson = resolveVm.actions().toString();
            }
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
