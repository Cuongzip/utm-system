package com.utm.flight.service;

import com.utm.flight.viewmodel.DroneBriefVm;

import java.util.Optional;

public interface DroneClientService {
    boolean checkDroneExists(String droneId);
    Optional<DroneBriefVm> getDroneById(String droneId);
}

