package com.utm.flight.viewmodel.flight;

import com.utm.flight.model.enumeration.ConformanceStatus;
import com.utm.flight.model.enumeration.FlightAuthorizationStatus;
import com.utm.flight.model.enumeration.FlightOperationMode;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.model.enumeration.FlightType;
import com.utm.flight.model.enumeration.RiskAssessmentLevel;
import com.utm.flight.model.enumeration.Verdict;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

@Schema(description = "Detailed profile and telemetry status of a Flight Plan / Operation")
public record FlightVm(
        String id,
        String flightNumber,
        String droneId,
        String departureHubId,
        String arrivalHubId,
        String pilotId,
        ZonedDateTime scheduledDeparture,
        ZonedDateTime scheduledArrival,
        ZonedDateTime actualDeparture,
        ZonedDateTime actualArrival,
        Double cruisingAltitudeM,
        String executionId,
        GeoJsonLineStringVm plannedRoute,
        GeoJsonLineStringVm actualRoute,
        FlightAuthorizationStatus authorizationStatus,
        ConformanceStatus conformanceStatus,
        FlightStatus status,
        Verdict feasibilityVerdict,
        String feasibilityOverride,
        String notes,
        ZonedDateTime createdOn,
        String createdBy,
        ZonedDateTime lastModifiedOn,
        String lastModifiedBy,
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
        String authorizationNumber,
        String authorizedBy,
        ZonedDateTime authorizedAt,
        RiskAssessmentLevel riskAssessment,
        String missionType,
        Map<String, Object> missionData,
        Map<String, Object> weatherConditions,
        Double expectedInitialBatteryPct,
        Integer minimumTurnaroundMinutes,
        String arrivalStopoverType
) {
    public FlightVm(
            String id, String flightNumber, String droneId, String departureHubId, String arrivalHubId,
            String pilotId, ZonedDateTime scheduledDeparture, ZonedDateTime scheduledArrival,
            ZonedDateTime actualDeparture, ZonedDateTime actualArrival, Double cruisingAltitudeM,
            String executionId, GeoJsonLineStringVm plannedRoute, GeoJsonLineStringVm actualRoute,
            FlightAuthorizationStatus authorizationStatus, ConformanceStatus conformanceStatus,
            FlightStatus status, Verdict feasibilityVerdict, String feasibilityOverride,
            String notes, ZonedDateTime createdOn, String createdBy, ZonedDateTime lastModifiedOn,
            String lastModifiedBy) {
        this(id, flightNumber, droneId, departureHubId, arrivalHubId, pilotId, scheduledDeparture,
                scheduledArrival, actualDeparture, actualArrival, cruisingAltitudeM, executionId,
                plannedRoute, actualRoute, authorizationStatus, conformanceStatus, status,
                feasibilityVerdict, feasibilityOverride, notes, createdOn, createdBy,
                lastModifiedOn, lastModifiedBy, null, null, null, null, null, 0.0,
                FlightType.DELIVERY, FlightOperationMode.AUTONOMOUS, null, null, null, null, null, null, null, null, null,
                null, 0, "none");
    }

    public FlightVm(
            String id, String flightNumber, String droneId, String departureHubId, String arrivalHubId,
            String pilotId, ZonedDateTime scheduledDeparture, ZonedDateTime scheduledArrival,
            ZonedDateTime actualDeparture, ZonedDateTime actualArrival, Double cruisingAltitudeM,
            String executionId, GeoJsonLineStringVm plannedRoute, GeoJsonLineStringVm actualRoute,
            FlightAuthorizationStatus authorizationStatus, ConformanceStatus conformanceStatus,
            FlightStatus status, Verdict feasibilityVerdict, String feasibilityOverride,
            String notes, ZonedDateTime createdOn, String createdBy, ZonedDateTime lastModifiedOn,
            String lastModifiedBy, List<FlightWaypointVm> waypoints) {
        this(id, flightNumber, droneId, departureHubId, arrivalHubId, pilotId, scheduledDeparture,
                scheduledArrival, actualDeparture, actualArrival, cruisingAltitudeM, executionId,
                plannedRoute, actualRoute, authorizationStatus, conformanceStatus, status,
                feasibilityVerdict, feasibilityOverride, notes, createdOn, createdBy,
                lastModifiedOn, lastModifiedBy, waypoints, null, null, null, null, 0.0,
                FlightType.DELIVERY, FlightOperationMode.AUTONOMOUS, null, null, null, null, null, null, null, null, null,
                null, 0, "none");
    }

    public FlightVm(
            String id, String flightNumber, String droneId, String departureHubId, String arrivalHubId,
            String pilotId, ZonedDateTime scheduledDeparture, ZonedDateTime scheduledArrival,
            ZonedDateTime actualDeparture, ZonedDateTime actualArrival, Double cruisingAltitudeM,
            String executionId, GeoJsonLineStringVm plannedRoute, GeoJsonLineStringVm actualRoute,
            FlightAuthorizationStatus authorizationStatus, ConformanceStatus conformanceStatus,
            FlightStatus status, Verdict feasibilityVerdict, String feasibilityOverride,
            String notes, ZonedDateTime createdOn, String createdBy, ZonedDateTime lastModifiedOn,
            String lastModifiedBy, List<FlightWaypointVm> waypoints, String missionId,
            Integer legIndex, Integer totalLegs, String dependsOnFlightId, Double payloadWeightKg) {
        this(id, flightNumber, droneId, departureHubId, arrivalHubId, pilotId, scheduledDeparture,
                scheduledArrival, actualDeparture, actualArrival, cruisingAltitudeM, executionId,
                plannedRoute, actualRoute, authorizationStatus, conformanceStatus, status,
                feasibilityVerdict, feasibilityOverride, notes, createdOn, createdBy,
                lastModifiedOn, lastModifiedBy, waypoints, missionId, legIndex, totalLegs, dependsOnFlightId, payloadWeightKg,
                FlightType.DELIVERY, FlightOperationMode.AUTONOMOUS, null, null, null, null, null, null, null, null, null,
                null, 0, "none");
    }
}
