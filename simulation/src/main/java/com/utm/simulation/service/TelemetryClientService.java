package com.utm.simulation.service;

import com.utm.simulation.viewmodel.TelemetryPushVm;

public interface TelemetryClientService {
    void pushTelemetry(TelemetryPushVm telemetry, String bearerToken);
}
