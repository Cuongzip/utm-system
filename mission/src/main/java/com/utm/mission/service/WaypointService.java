package com.utm.mission.service;

import com.utm.mission.viewmodel.WaypointPostVm;
import com.utm.mission.viewmodel.WaypointPutVm;
import com.utm.mission.viewmodel.WaypointReorderVm;
import com.utm.mission.viewmodel.WaypointVm;

import java.util.List;

public interface WaypointService {

    WaypointVm addWaypoint(String missionId, WaypointPostVm postVm);

    List<WaypointVm> getWaypoints(String missionId);

    WaypointVm updateWaypoint(String missionId, String waypointId, WaypointPutVm putVm);

    void deleteWaypoint(String missionId, String waypointId);

    List<WaypointVm> reorderWaypoints(String missionId, WaypointReorderVm reorderVm);
}
