package com.utm.flight.service;

import com.utm.flight.model.Flight;
import com.utm.flight.model.FlightConformance;
import com.utm.flight.viewmodel.TelemetryBriefVm;

public interface ConflictClientService {

    void reportConformanceConflict(Flight flight, FlightConformance conformance,
                                   TelemetryBriefVm telemetry, String message);
}
