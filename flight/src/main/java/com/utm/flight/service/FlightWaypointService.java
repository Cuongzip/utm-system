package com.utm.flight.service;

import java.util.List;

import com.utm.flight.viewmodel.WaypointPostVm;
import com.utm.flight.viewmodel.WaypointPutVm;
import com.utm.flight.viewmodel.WaypointReorderVm;
import com.utm.flight.viewmodel.WaypointVm;

public interface FlightWaypointService {

    List<WaypointVm> getFlightWaypoints(String flightId);

    WaypointVm getWaypointById(String flightId, String waypointId);

    WaypointVm addWaypoint(String flightId, WaypointPostVm postVm);

    WaypointVm updateWaypoint(String flightId, String waypointId, WaypointPutVm putVm);

    void deleteWaypoint(String flightId, String waypointId);

    List<WaypointVm> reorderWaypoints(String flightId, WaypointReorderVm reorderVm);
}
