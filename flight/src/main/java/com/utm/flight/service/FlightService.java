package com.utm.flight.service;

import com.utm.flight.viewmodel.flight.FlightAbortVm;
import com.utm.flight.viewmodel.flight.FlightListVm;
import com.utm.flight.viewmodel.flight.FlightPostVm;
import com.utm.flight.viewmodel.flight.FlightPutVm;
import com.utm.flight.viewmodel.flight.FlightRejectVm;
import com.utm.flight.viewmodel.flight.FlightVm;

import java.util.List;

public interface FlightService {

    FlightListVm getFlights(String status, String authorizationStatus, String pilotId, String droneId, int limit, int offset);

    List<FlightVm> getAllFlights(String status, String pilotId, String droneId);

    FlightVm getFlightById(String id);

    FlightVm createFlight(FlightPostVm flightPostVm);

    FlightVm updateFlight(String id, FlightPutVm flightPutVm);

    FlightVm authorizeFlight(String id);

    FlightVm rejectFlight(String id, FlightRejectVm rejectVm);

    FlightVm startFlight(String id);

    FlightVm completeFlight(String id);

    FlightVm abortFlight(String id, FlightAbortVm abortVm);
}

