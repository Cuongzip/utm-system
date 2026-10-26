package com.utm.conflict.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.conflict.mapper.ConflictSnapshotMapper;
import com.utm.conflict.model.Conflict;
import com.utm.conflict.model.ConflictSnapshot;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.repository.ConflictRepository;
import com.utm.conflict.repository.ConflictSnapshotRepository;
import com.utm.conflict.viewmodel.ConflictSnapshotVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConflictSnapshotServiceImpl implements ConflictSnapshotService {

    private final ConflictSnapshotRepository conflictSnapshotRepository;
    private final ConflictRepository conflictRepository;
    private final ConflictSnapshotMapper conflictSnapshotMapper;

    @Override
    @Transactional(readOnly = true)
    public List<ConflictSnapshotVm> getSnapshotsByConflictId(String conflictId) {
        if (!conflictRepository.existsById(conflictId)) {
            throw new NotFoundException(MessageCode.CONFLICT_NOT_FOUND, conflictId);
        }
        List<ConflictSnapshot> snapshots = conflictSnapshotRepository.findByConflictIdOrderByRecordedAtAsc(conflictId);
        return conflictSnapshotMapper.toVmList(snapshots);
    }

    @Override
    @Transactional
    public void recordSnapshot(
            Conflict conflict,
            Double pLat, Double pLon, Double pAlt,
            Double sLat, Double sLon, Double sAlt,
            Double distHoriz, Double distVert,
            Integer timeToConflict,
            ConflictSeverity severity
    ) {
        if (conflict == null) {
            return;
        }
        ConflictSnapshot snapshot = conflictSnapshotMapper.toEntity(
                conflict,
                pLat, pLon, pAlt,
                sLat, sLon, sAlt,
                distHoriz, distVert,
                timeToConflict,
                severity
        );
        conflictSnapshotRepository.save(snapshot);
    }
}
