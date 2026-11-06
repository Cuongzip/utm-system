package com.utm.connectivity.service.client;

import com.utm.connectivity.viewmodel.client.DroneBriefVm;

import java.util.Optional;

public interface DroneClientService {

    Optional<DroneBriefVm> getDroneById(String droneId);
}
