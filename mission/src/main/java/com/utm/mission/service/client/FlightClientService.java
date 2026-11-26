package com.utm.mission.service.client;

import com.utm.mission.viewmodel.client.FlightBriefVm;
import com.utm.mission.viewmodel.client.FlightCreateRequestVm;

import java.util.Map;
import java.util.Optional;

public interface FlightClientService {

    Optional<FlightBriefVm> createFlight(FlightCreateRequestVm requestVm);

    default boolean abortFlight(String flightId, String reason) {
        return false;
    }

    default boolean reassignFlightDrone(String flightId, String newDroneId) {
        return false;
    }

    default boolean updateFlightLegPlan(String flightId, Map<String, Object> updates) {
        return false;
    }
}
