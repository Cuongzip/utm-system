package com.utm.commonlibrary.kafka.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.ZonedDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FlightLifecycleEvent(
        String eventType,
        String flightId,
        String flightNumber,
        String missionId,
        String executionId,
        Integer legIndex,
        Integer totalLegs,
        String droneId,
        String departureHubId,
        String arrivalHubId,
        String actualLandingHubId,
        String status,
        Integer waypointIndex,
        Double durationHours,
        String reason,
        ZonedDateTime timestamp,
        Double endingBatteryPct,
        String stopoverType,
        Boolean waitForConfirmation
) {
    public FlightLifecycleEvent(
            String eventType,
            String flightId,
            String flightNumber,
            String missionId,
            String executionId,
            Integer legIndex,
            Integer totalLegs,
            String droneId,
            String departureHubId,
            String arrivalHubId,
            String actualLandingHubId,
            String status,
            Integer waypointIndex,
            Double durationHours,
            String reason,
            ZonedDateTime timestamp
    ) {
        this(
                eventType,
                flightId,
                flightNumber,
                missionId,
                executionId,
                legIndex,
                totalLegs,
                droneId,
                departureHubId,
                arrivalHubId,
                actualLandingHubId,
                status,
                waypointIndex,
                durationHours,
                reason,
                timestamp,
                null,
                null,
                null
        );
    }
    public static final String FLIGHT_CREATED = "FLIGHT_CREATED";
    public static final String FLIGHT_UPDATED = "FLIGHT_UPDATED";
    public static final String FLIGHT_AUTHORIZED = "FLIGHT_AUTHORIZED";
    public static final String FLIGHT_STARTED = "FLIGHT_STARTED";
    public static final String FLIGHT_WAYPOINT_REACHED = "FLIGHT_WAYPOINT_REACHED";
    public static final String FLIGHT_DIVERTED = "FLIGHT_DIVERTED";
    public static final String FLIGHT_EMERGENCY_LANDING = "FLIGHT_EMERGENCY_LANDING";
    public static final String FLIGHT_COMPLETED = "FLIGHT_COMPLETED";
    public static final String FLIGHT_CANCELLED = "FLIGHT_CANCELLED";
    public static final String FLIGHT_REJECTED = "FLIGHT_REJECTED";
}
