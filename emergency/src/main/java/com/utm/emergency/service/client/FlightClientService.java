package com.utm.emergency.service.client;

import com.utm.emergency.viewmodel.client.FlightSummaryVm;

import java.util.Optional;

public interface FlightClientService {
    Optional<FlightSummaryVm> getFlightById(String flightId);
}