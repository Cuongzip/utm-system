package com.utm.mission.service.client;

import com.utm.mission.viewmodel.client.DroneBriefVm;

import java.util.List;
import java.util.Optional;

public interface DroneClientService {

    Optional<DroneBriefVm> getDroneById(String droneId);

    List<DroneBriefVm> getAvailableDronesAtHub(String hubId);

    default boolean sendDroneCommand(String droneId, String commandType, String flightId, String parameters) {
        return false;
    }
}
