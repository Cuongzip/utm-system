package com.utm.emergency.service.client;

import com.utm.emergency.viewmodel.client.DroneSummaryVm;

import java.util.Map;
import java.util.Optional;

public interface DroneClientService {
    boolean sendEmergencyCommand(String droneId, String command, String flightId, String incidentId);

    default boolean sendEmergencyCommand(String droneId, String command, String flightId, String incidentId,
            Map<String, Object> extraParams) {
        return sendEmergencyCommand(droneId, command, flightId, incidentId);
    }

    Optional<DroneSummaryVm> getDroneById(String droneId);
}