package com.utm.conflict.service;

import com.utm.conflict.viewmodel.client.TelemetryBriefVm;
import com.utm.conflict.viewmodel.conflict.ConflictScanResultVm;

public interface ConflictDetectionService {

    ConflictScanResultVm runConflictScan();

    void evaluateLiveTelemetry(TelemetryBriefVm telemetry);
}
