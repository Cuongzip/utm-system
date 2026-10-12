package com.utm.flight.service;

import com.utm.flight.viewmodel.TelemetryBriefVm;
import java.util.Optional;

public interface TelemetryClientService {
    Optional<TelemetryBriefVm> getLatestFlightTelemetry(String flightId);
}
