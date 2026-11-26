package com.utm.flight.viewmodel.flight;

import com.utm.flight.model.enumeration.FlightOperationMode;
import com.utm.flight.model.enumeration.FlightType;
import com.utm.flight.model.enumeration.RiskAssessmentLevel;
import com.utm.flight.model.enumeration.Verdict;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

@Schema(description = "Request payload for updating an existing Flight Plan before departure")
public record FlightPutVm(
        String droneId,
        String departureHubId,
        String arrivalHubId,
        String pilotId,
        ZonedDateTime scheduledDeparture,
        ZonedDateTime scheduledArrival,
        Double cruisingAltitudeM,
        String notes,
        GeoJsonLineStringVm plannedRoute,
        GeoJsonLineStringVm actualRoute,
        String feasibilityOverride,
        Verdict feasibilityVerdict,
        List<FlightWaypointVm> waypoints,
        Double payloadWeightKg,
        FlightType flightType,
        FlightOperationMode operationMode,
        Double minAltitudeM,
        Double maxAltitudeM,
        RiskAssessmentLevel riskAssessment,
        String missionType,
        Map<String, Object> missionData,
        String dependsOnFlightId,
        Double expectedInitialBatteryPct,
        Integer minimumTurnaroundMinutes,
        String arrivalStopoverType
) {
    public FlightPutVm(
            String droneId, String departureHubId, String arrivalHubId,
            String pilotId, ZonedDateTime scheduledDeparture, ZonedDateTime scheduledArrival,
            Double cruisingAltitudeM, String notes, GeoJsonLineStringVm plannedRoute,
            GeoJsonLineStringVm actualRoute, String feasibilityOverride, Verdict feasibilityVerdict) {
        this(droneId, departureHubId, arrivalHubId, pilotId, scheduledDeparture, scheduledArrival,
                cruisingAltitudeM, notes, plannedRoute, actualRoute, feasibilityOverride,
                feasibilityVerdict, null, null, null, null, null, null, null, null, null,
                null, null, null, null);
    }

    public FlightPutVm(
            String droneId, String departureHubId, String arrivalHubId,
            String pilotId, ZonedDateTime scheduledDeparture, ZonedDateTime scheduledArrival,
            Double cruisingAltitudeM, String notes, GeoJsonLineStringVm plannedRoute,
            GeoJsonLineStringVm actualRoute, String feasibilityOverride, Verdict feasibilityVerdict,
            List<FlightWaypointVm> waypoints) {
        this(droneId, departureHubId, arrivalHubId, pilotId, scheduledDeparture, scheduledArrival,
                cruisingAltitudeM, notes, plannedRoute, actualRoute, feasibilityOverride,
                feasibilityVerdict, waypoints, null, null, null, null, null, null, null, null,
                null, null, null, null);
    }

    public FlightPutVm(
            String droneId, String departureHubId, String arrivalHubId,
            String pilotId, ZonedDateTime scheduledDeparture, ZonedDateTime scheduledArrival,
            Double cruisingAltitudeM, String notes, GeoJsonLineStringVm plannedRoute,
            GeoJsonLineStringVm actualRoute, String feasibilityOverride, Verdict feasibilityVerdict,
            List<FlightWaypointVm> waypoints, Double payloadWeightKg) {
        this(droneId, departureHubId, arrivalHubId, pilotId, scheduledDeparture, scheduledArrival,
                cruisingAltitudeM, notes, plannedRoute, actualRoute, feasibilityOverride,
                feasibilityVerdict, waypoints, payloadWeightKg, null, null, null, null, null, null, null,
                null, null, null, null);
    }
}
