package com.utm.simulation.service;

import com.utm.simulation.viewmodel.FlightDetailVm;
import com.utm.simulation.viewmodel.WaypointVm;

import java.util.List;

public interface FlightClientService {
    FlightDetailVm getFlightDetail(String flightId);
    List<WaypointVm> getFlightWaypoints(String flightId);
}

