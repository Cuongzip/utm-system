package com.utm.flight.service.client;

import com.utm.flight.model.Flight;
import com.utm.flight.viewmodel.client.TelemetryBriefVm;

public interface EmergencyClientService {

    void reportIncident(Flight flight, String emergencyType, String severity,
                        String message, TelemetryBriefVm telemetry, Object detectionData);
}
