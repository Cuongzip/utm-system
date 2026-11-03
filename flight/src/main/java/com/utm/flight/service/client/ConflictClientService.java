package com.utm.flight.service.client;

import com.utm.flight.model.Flight;
import com.utm.flight.model.FlightConformance;
import com.utm.flight.viewmodel.client.TelemetryBriefVm;

public interface ConflictClientService {

    void reportConformanceConflict(Flight flight, FlightConformance conformance,
                                   TelemetryBriefVm telemetry, String message);
}


