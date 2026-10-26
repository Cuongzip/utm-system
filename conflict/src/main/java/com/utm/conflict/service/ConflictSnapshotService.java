package com.utm.conflict.service;

import com.utm.conflict.model.Conflict;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.viewmodel.ConflictSnapshotVm;

import java.util.List;

public interface ConflictSnapshotService {

    List<ConflictSnapshotVm> getSnapshotsByConflictId(String conflictId);

    void recordSnapshot(
            Conflict conflict,
            Double pLat, Double pLon, Double pAlt,
            Double sLat, Double sLon, Double sAlt,
            Double distHoriz, Double distVert,
            Integer timeToConflict,
            ConflictSeverity severity
    );
}
