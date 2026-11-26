package com.utm.flight.viewmodel.flight;

import com.utm.flight.model.enumeration.FlightOperationMode;
import com.utm.flight.model.enumeration.FlightType;
import com.utm.flight.model.enumeration.RiskAssessmentLevel;
import com.utm.flight.model.enumeration.Verdict;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

@Schema(description = "Request payload for registering a new Flight Plan")
public record FlightPostVm(
        @Size(min = 3, max = 50, message = "Flight number must be between 3 and 50 characters")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Flight number must contain only alphanumeric characters, dashes, and underscores")
        String flightNumber,
        @NotBlank(message = "Drone ID cannot be blank") String droneId,
        @NotBlank(message = "Departure Hub ID cannot be blank") String departureHubId,
        @NotBlank(message = "Arrival Hub ID cannot be blank") String arrivalHubId,
        String pilotId,
        @NotNull(message = "Scheduled departure time is required") ZonedDateTime scheduledDeparture,
        @NotNull(message = "Scheduled arrival time is required") ZonedDateTime scheduledArrival,
        Double cruisingAltitudeM,
        String notes,
        String executionId,
        GeoJsonLineStringVm plannedRoute,
        String feasibilityOverride,
        Verdict feasibilityVerdict,
        List<FlightWaypointVm> waypoints,
        String missionId,
        Integer legIndex,
        Integer totalLegs,
        String dependsOnFlightId,
        Double payloadWeightKg,
        FlightType flightType,
        FlightOperationMode operationMode,
        Double minAltitudeM,
        Double maxAltitudeM,
        RiskAssessmentLevel riskAssessment,
        String missionType,
        Map<String, Object> missionData,
        Double expectedInitialBatteryPct,
        Integer minimumTurnaroundMinutes,
        String arrivalStopoverType
) {
    public FlightPostVm(
            String flightNumber, String droneId, String departureHubId, String arrivalHubId,
            String pilotId, ZonedDateTime scheduledDeparture, ZonedDateTime scheduledArrival,
            Double cruisingAltitudeM, String notes, String executionId,
            GeoJsonLineStringVm plannedRoute, String feasibilityOverride, Verdict feasibilityVerdict) {
        this(flightNumber, droneId, departureHubId, arrivalHubId, pilotId, scheduledDeparture,
                scheduledArrival, cruisingAltitudeM, notes, executionId, plannedRoute,
                feasibilityOverride, feasibilityVerdict, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, 0, "none");
    }

    public FlightPostVm(
            String flightNumber, String droneId, String departureHubId, String arrivalHubId,
            String pilotId, ZonedDateTime scheduledDeparture, ZonedDateTime scheduledArrival,
            Double cruisingAltitudeM, String notes, String executionId,
            GeoJsonLineStringVm plannedRoute, String feasibilityOverride, Verdict feasibilityVerdict,
            List<FlightWaypointVm> waypoints) {
        this(flightNumber, droneId, departureHubId, arrivalHubId, pilotId, scheduledDeparture,
                scheduledArrival, cruisingAltitudeM, notes, executionId, plannedRoute,
                feasibilityOverride, feasibilityVerdict, waypoints, null, null, null, null, null,
                null, null, null, null, null, null, null, null, 0, "none");
    }

    public FlightPostVm(
            String flightNumber, String droneId, String departureHubId, String arrivalHubId,
            String pilotId, ZonedDateTime scheduledDeparture, ZonedDateTime scheduledArrival,
            Double cruisingAltitudeM, String notes, String executionId,
            GeoJsonLineStringVm plannedRoute, String feasibilityOverride, Verdict feasibilityVerdict,
            List<FlightWaypointVm> waypoints, String missionId, Integer legIndex,
            Integer totalLegs, String dependsOnFlightId, Double payloadWeightKg) {
        this(flightNumber, droneId, departureHubId, arrivalHubId, pilotId, scheduledDeparture,
                scheduledArrival, cruisingAltitudeM, notes, executionId, plannedRoute,
                feasibilityOverride, feasibilityVerdict, waypoints, missionId, legIndex,
                totalLegs, dependsOnFlightId, payloadWeightKg,
                null, null, null, null, null, null, null, null, 0, "none");
    }
}
