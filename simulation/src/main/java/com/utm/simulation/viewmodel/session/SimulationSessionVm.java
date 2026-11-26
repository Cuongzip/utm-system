package com.utm.simulation.viewmodel.session;

import com.utm.simulation.model.enumeration.SimulationStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Details of a virtual flight simulation session")
public record SimulationSessionVm(
        String id,
        String flightId,
        String droneId,
        SimulationStatus status,
        Double speed,
        Double timeScale,
        Double currentLat,
        Double currentLon,
        Double currentAlt,
        Double currentHeading,
        Double currentBattery,
        Double progress,
        Double totalDistance,
        Double traveledDistance,
        Integer currentSegment,
        String activeScenario,
        ZonedDateTime createdOn,
        ZonedDateTime lastModifiedOn,
        String missionId,
        String flightPhase,
        Double tickRate
) {
    public SimulationSessionVm(
            String id, String flightId, String droneId, SimulationStatus status,
            Double speed, Double timeScale, Double currentLat, Double currentLon,
            Double currentAlt, Double currentHeading, Double currentBattery,
            Double progress, Double totalDistance, Double traveledDistance,
            Integer currentSegment, String activeScenario,
            ZonedDateTime createdOn, ZonedDateTime lastModifiedOn) {
        this(id, flightId, droneId, status, speed, timeScale, currentLat, currentLon,
                currentAlt, currentHeading, currentBattery, progress, totalDistance,
                traveledDistance, currentSegment, activeScenario, createdOn, lastModifiedOn,
                null, "CRUISE", 1.0);
    }
}
