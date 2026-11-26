package com.utm.connectivity.service.client;

import com.utm.connectivity.viewmodel.client.DroneBriefVm;
import com.utm.connectivity.viewmodel.client.DroneCreateClientVm;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface DroneClientService {

    Optional<DroneBriefVm> getDroneById(String droneId);

    Map<String, DroneBriefVm> getDronesByIds(Collection<String> droneIds);

    default List<DroneBriefVm> getAllDrones() {
        return List.of();
    }

    default Optional<DroneBriefVm> createDrone(DroneCreateClientVm createVm) {
        return Optional.empty();
    }
}
