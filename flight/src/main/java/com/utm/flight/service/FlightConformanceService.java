package com.utm.flight.service;

import com.utm.flight.viewmodel.FlightConformanceAlertVm;
import com.utm.flight.viewmodel.FlightConformanceVm;

import java.util.List;

public interface FlightConformanceService {

    FlightConformanceVm getConformance(String flightId);

    FlightConformanceVm evaluateFlightConformance(String flightId);

    List<FlightConformanceAlertVm> getAlerts(String flightId);

    void acknowledgeAlert(String alertId);

    void checkActiveFlightsConformance();
}
