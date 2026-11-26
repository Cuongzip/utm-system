package com.utm.simulation.service.client;

import com.utm.simulation.viewmodel.client.FlightDetailVm;

import com.utm.simulation.viewmodel.client.WaypointVm;

import java.util.List;

public interface FlightClientService {
    FlightDetailVm getFlightDetail(String flightId);

    List<WaypointVm> getFlightWaypoints(String flightId);

    default boolean startFlight(String flightId) {
        return false;
    }

    default boolean completeFlight(String flightId) {
        return false;
    }

    default boolean completeFlight(String flightId, String bearerToken) {
        return completeFlight(flightId);
    }

    default boolean abortFlight(String flightId, String reason) {
        return false;
    }

    default boolean abortFlight(String flightId, String reason, String bearerToken) {
        return abortFlight(flightId, reason);
    }
}
