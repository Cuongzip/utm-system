package com.utm.flight.service;

import com.utm.flight.viewmodel.flight.FlightConformanceVm;

public interface FlightConformanceService {

    FlightConformanceVm getConformance(String flightId);

    FlightConformanceVm evaluateFlightConformance(String flightId);

    void checkActiveFlightsConformance();
}


