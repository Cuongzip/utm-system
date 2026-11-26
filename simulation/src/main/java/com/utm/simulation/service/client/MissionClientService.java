package com.utm.simulation.service.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.utm.simulation.viewmodel.client.WaypointVm;

import java.util.List;
import java.util.Optional;

public interface MissionClientService {

    @JsonIgnoreProperties(ignoreUnknown = true)
    record MissionSimulationVm(
            String id,
            String droneId,
            List<MissionWaypointItemVm> waypoints
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record MissionWaypointItemVm(
            Integer sequence,
            Double latitude,
            Double longitude,
            Double altitude,
            Double speedToWaypoint,
            Integer hoverDurationSec,
            Double headingAtWaypoint
    ) {
    }

    Optional<MissionSimulationVm> getMissionById(String missionId);

    default List<WaypointVm> toSimulationWaypoints(MissionSimulationVm mission) {
        if (mission == null || mission.waypoints() == null) {
            return List.of();
        }
        return mission.waypoints().stream()
                .filter(w -> w.latitude() != null && w.longitude() != null)
                .map(w -> new WaypointVm(
                        w.latitude(),
                        w.longitude(),
                        w.altitude() != null ? w.altitude() : 50.0,
                        w.speedToWaypoint(),
                        w.hoverDurationSec() != null ? w.hoverDurationSec() : 0,
                        w.headingAtWaypoint()))
                .toList();
    }
}
