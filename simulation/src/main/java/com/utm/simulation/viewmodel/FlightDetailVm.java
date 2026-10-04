package com.utm.simulation.viewmodel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "Details of flight retrieved from flight service")
public record FlightDetailVm(
        String id,
        String flightNumber,
        String droneId,
        String departureHubId,
        String arrivalHubId,
        Integer totalWaypoints,
        List<WaypointVm> waypoints) {
}
