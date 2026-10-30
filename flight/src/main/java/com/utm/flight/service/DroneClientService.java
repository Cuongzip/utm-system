package com.utm.flight.service;

import com.utm.flight.viewmodel.DroneBriefVm;
import com.utm.flight.viewmodel.DroneEnergySpecVm;

import java.util.Optional;

public interface DroneClientService {
    boolean checkDroneExists(String droneId);
    Optional<DroneBriefVm> getDroneById(String droneId);
    Optional<DroneEnergySpecVm> getDroneEnergySpec(String droneId);
}
