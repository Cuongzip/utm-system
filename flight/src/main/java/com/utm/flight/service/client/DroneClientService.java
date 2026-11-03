package com.utm.flight.service.client;

import com.utm.flight.viewmodel.client.DroneBriefVm;
import com.utm.flight.viewmodel.feasibility.DroneEnergySpecVm;

import java.util.Optional;

public interface DroneClientService {
    boolean checkDroneExists(String droneId);
    Optional<DroneBriefVm> getDroneById(String droneId);
    Optional<DroneEnergySpecVm> getDroneEnergySpec(String droneId);
}


