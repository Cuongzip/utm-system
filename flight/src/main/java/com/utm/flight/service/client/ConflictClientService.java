package com.utm.flight.service.client;

import com.utm.flight.model.Flight;
import com.utm.flight.model.FlightConformance;
import com.utm.flight.viewmodel.client.TelemetryBriefVm;
import com.utm.flight.viewmodel.client.TrajectoryConflictCheckResultClientVm;

import java.util.Optional;

public interface ConflictClientService {

    void reportConformanceConflict(Flight flight, FlightConformance conformance,
                                   TelemetryBriefVm telemetry, String message);

    default void reportConformanceConflict(Flight flight, FlightConformance conformance,
                                           TelemetryBriefVm telemetry, String message,
                                           String conflictType, String alertType) {
        reportConformanceConflict(flight, conformance, telemetry, message);
    }

    default void resolveConformanceConflicts(String flightId, String reason) {
    }

    default Optional<TrajectoryConflictCheckResultClientVm> checkTrajectory4D(Flight flight) {
        return Optional.empty();
    }
}
