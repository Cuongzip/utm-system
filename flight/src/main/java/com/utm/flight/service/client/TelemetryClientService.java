package com.utm.flight.service.client;

import com.utm.flight.viewmodel.client.TelemetryBriefVm;
import java.util.Optional;

public interface TelemetryClientService {
    Optional<TelemetryBriefVm> getLatestFlightTelemetry(String flightId);
}


