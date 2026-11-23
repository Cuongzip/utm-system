package com.utm.emergency.service.client;

import com.utm.emergency.viewmodel.client.DroneSummaryVm;

import java.util.Optional;

public interface DroneClientService {
    boolean sendEmergencyCommand(String droneId, String command, String flightId, String incidentId);
    Optional<DroneSummaryVm> getDroneById(String droneId);
}