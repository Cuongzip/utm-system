package com.utm.flight.service;

import com.utm.flight.viewmodel.flight.FlightAbortVm;
import com.utm.flight.viewmodel.flight.FlightListVm;
import com.utm.flight.viewmodel.flight.FlightPostVm;
import com.utm.flight.viewmodel.flight.FlightPutVm;
import com.utm.flight.viewmodel.flight.FlightRejectVm;
import com.utm.flight.viewmodel.flight.FlightVm;

import java.time.ZonedDateTime;
import java.util.List;

public interface FlightService {

    FlightListVm getFlights(String status, String authorizationStatus, String pilotId, String droneId,
            String executionId, int limit, int offset);

    default FlightListVm getFlights(String status, String authorizationStatus, String pilotId, String droneId,
            String executionId, String hubId, String flightType, int limit, int offset) {
        return getFlights(status, authorizationStatus, pilotId, droneId, executionId, limit, offset);
    }

    default FlightListVm getFlights(String status, String authorizationStatus, String pilotId, String droneId,
            String executionId, String hubId, String flightType, ZonedDateTime from, ZonedDateTime to,
            int limit, int offset) {
        return getFlights(status, authorizationStatus, pilotId, droneId, executionId, hubId, flightType, limit, offset);
    }

    default FlightListVm getFlights(String status, String authorizationStatus, String pilotId, String droneId,
            int limit, int offset) {
        return getFlights(status, authorizationStatus, pilotId, droneId, null, limit, offset);
    }

    List<FlightVm> getAllFlights(String status, String pilotId, String droneId);

    FlightVm getFlightById(String id);

    FlightVm createFlight(FlightPostVm flightPostVm);

    FlightVm updateFlight(String id, FlightPutVm flightPutVm);

    FlightVm authorizeFlight(String id);

    FlightVm rejectFlight(String id, FlightRejectVm rejectVm);

    FlightVm startFlight(String id);

    FlightVm completeFlight(String id);

    FlightVm abortFlight(String id, FlightAbortVm abortVm);

    default FlightVm divertFlight(String id, String targetHubId, String reason) {
        throw new UnsupportedOperationException("divertFlight not implemented");
    }
}
