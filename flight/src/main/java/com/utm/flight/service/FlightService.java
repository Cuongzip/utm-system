package com.utm.flight.service;

import com.utm.flight.viewmodel.FlightAbortVm;
import com.utm.flight.viewmodel.FlightPostVm;
import com.utm.flight.viewmodel.FlightPutVm;
import com.utm.flight.viewmodel.FlightVm;

import java.util.List;

public interface FlightService {

    List<FlightVm> getAllFlights(String status, String pilotId, String droneId);

    FlightVm getFlightById(String id);

    FlightVm createFlight(FlightPostVm flightPostVm);

    FlightVm updateFlight(String id, FlightPutVm flightPutVm);

    FlightVm authorizeFlight(String id);

    FlightVm startFlight(String id);

    FlightVm completeFlight(String id);

    FlightVm abortFlight(String id, FlightAbortVm abortVm);
}
