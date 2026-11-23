package com.utm.connectivity.service.client;

import com.utm.connectivity.viewmodel.client.DroneBriefVm;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;

public interface DroneClientService {

    Optional<DroneBriefVm> getDroneById(String droneId);

    Map<String, DroneBriefVm> getDronesByIds(Collection<String> droneIds);
}
