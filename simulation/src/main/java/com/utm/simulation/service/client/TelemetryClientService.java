package com.utm.simulation.service.client;

import com.utm.simulation.viewmodel.client.TelemetryPushVm;

public interface TelemetryClientService {
    void pushTelemetry(TelemetryPushVm telemetry);

    void pushTelemetry(TelemetryPushVm telemetry, String bearerToken);
}
