package com.utm.drone.service;

import com.utm.drone.model.enumeration.DroneStatus;
import com.utm.drone.viewmodel.drone.DroneListVm;
import com.utm.drone.viewmodel.drone.DronePostVm;
import com.utm.drone.viewmodel.drone.DronePutVm;
import com.utm.drone.viewmodel.drone.DroneVm;

public interface DroneService {

    DroneListVm getDrones(DroneStatus status, String homeHubId, String ownerId, String search, int limit, int offset);

    DroneVm getDroneById(String id);

    DroneVm createDrone(DronePostVm dronePostVm);

    DroneVm updateDrone(String id, DronePutVm dronePutVm);

    void deleteDrone(String id);
}

