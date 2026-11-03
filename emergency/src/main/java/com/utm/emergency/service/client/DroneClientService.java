package com.utm.emergency.service.client;

import java.util.Optional;

public interface DroneClientService {
    record DroneSummaryVm(String id, String registrationNumber, String model, Double maxSpeed, Double batteryLevel) {}
    boolean sendEmergencyCommand(String droneId, String command, String flightId, String incidentId);
    Optional<DroneSummaryVm> getDroneById(String droneId);
}