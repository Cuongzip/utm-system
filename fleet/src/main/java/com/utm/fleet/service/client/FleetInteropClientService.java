package com.utm.fleet.service.client;

import com.utm.fleet.viewmodel.FleetDtos.DroneClientVm;
import com.utm.fleet.viewmodel.FleetDtos.HubClientVm;
import com.utm.fleet.viewmodel.FleetDtos.MissionClientVm;

import java.util.List;
import java.util.Optional;

public interface FleetInteropClientService {

    List<HubClientVm> getAllHubs();

    Optional<HubClientVm> getHubById(String hubId);

    List<DroneClientVm> getAllDrones(String hubId);

    Optional<DroneClientVm> getDroneById(String droneId);

    List<MissionClientVm> getMissionsByStatus(String status);

    Optional<MissionClientVm> getMissionById(String missionId);

    Optional<Double> getLatestBatteryLevel(String droneId);

    void updateDroneStatus(String droneId, String status);

    void updateDroneHub(String droneId, String hubId);

    void updateMissionDrone(String missionId, String droneId);

    Optional<String> createRepositioningMission(String droneId, HubClientVm sourceHub, HubClientVm targetHub);

    Optional<String> createRepositioningFlight(String missionId, String droneId, HubClientVm sourceHub, HubClientVm targetHub);
}
