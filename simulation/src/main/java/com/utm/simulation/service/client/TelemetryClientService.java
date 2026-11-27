package com.utm.simulation.service.client;

import com.utm.simulation.viewmodel.client.TelemetryLatestVm;
import com.utm.simulation.viewmodel.client.TelemetryPushVm;

import java.util.Optional;

public interface TelemetryClientService {
    void pushTelemetry(TelemetryPushVm telemetry);

    void pushTelemetry(TelemetryPushVm telemetry, String bearerToken);

    default Optional<TelemetryLatestVm> getLatestFlightTelemetry(String flightId) {
        return Optional.empty();
    }
}
