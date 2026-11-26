package com.utm.conflict.service;

import com.utm.conflict.viewmodel.client.TelemetryBriefVm;
import com.utm.conflict.viewmodel.conflict.ConflictScanResultVm;
import com.utm.conflict.viewmodel.conflict.StrategicTrajectoryCheckPostVm;
import com.utm.conflict.viewmodel.conflict.StrategicTrajectoryCheckResultVm;

public interface ConflictDetectionService {

    ConflictScanResultVm runConflictScan();

    void evaluateLiveTelemetry(TelemetryBriefVm telemetry);

    default StrategicTrajectoryCheckResultVm checkTrajectory4D(StrategicTrajectoryCheckPostVm request) {
        throw new UnsupportedOperationException("checkTrajectory4D not implemented");
    }
}
