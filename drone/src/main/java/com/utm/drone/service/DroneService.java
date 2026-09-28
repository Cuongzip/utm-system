package com.utm.drone.service;

import com.utm.drone.viewmodel.DronePostVm;
import com.utm.drone.viewmodel.DronePutVm;
import com.utm.drone.viewmodel.DroneVm;

import java.util.List;

public interface DroneService {

    List<DroneVm> getAllDrones();

    DroneVm getDroneById(String id);

    DroneVm createDrone(DronePostVm dronePostVm);

    DroneVm updateDrone(String id, DronePutVm dronePutVm);

    void retireDrone(String id);
}
