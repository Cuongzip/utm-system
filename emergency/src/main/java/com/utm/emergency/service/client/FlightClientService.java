package com.utm.emergency.service.client;

import java.util.Optional;

public interface FlightClientService {
    record FlightSummaryVm(String id, String flightNumber, String droneId, String departureHubId, String arrivalHubId, String status) {}
    Optional<FlightSummaryVm> getFlightById(String flightId);
}