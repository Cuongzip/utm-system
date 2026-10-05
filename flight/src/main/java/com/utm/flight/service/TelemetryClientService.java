package com.utm.flight.service;

import com.utm.flight.viewmodel.TelemetryRecordVm;
import java.util.Optional;

public interface TelemetryClientService {
    Optional<TelemetryRecordVm> getLatestFlightTelemetry(String flightId);
}
