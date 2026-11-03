package com.utm.simulation.service.client;

import com.utm.simulation.viewmodel.client.FlightDetailVm;

import com.utm.simulation.viewmodel.client.WaypointVm;

import java.util.List;

public interface FlightClientService {
    FlightDetailVm getFlightDetail(String flightId);

    List<WaypointVm> getFlightWaypoints(String flightId);
}
