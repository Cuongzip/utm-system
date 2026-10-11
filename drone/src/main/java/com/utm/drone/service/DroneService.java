package com.utm.drone.service;

import com.utm.drone.model.enumeration.DroneStatus;
import com.utm.drone.viewmodel.DroneListVm;
import com.utm.drone.viewmodel.DronePostVm;
import com.utm.drone.viewmodel.DronePutVm;
import com.utm.drone.viewmodel.DroneVm;

public interface DroneService {

    DroneListVm getDrones(DroneStatus status, String homeHubId, String ownerId, String search, int limit, int offset);

    DroneVm getDroneById(String id);

    DroneVm createDrone(DronePostVm dronePostVm);

    DroneVm updateDrone(String id, DronePutVm dronePutVm);

    void deleteDrone(String id);
}
