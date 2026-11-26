package com.utm.mission.viewmodel.template;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.utm.mission.model.enumeration.StopoverType;
import com.utm.mission.model.enumeration.WaypointType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "Parameterized waypoint blueprint inside a Mission Template")
public record WaypointBlueprintVm(
        Integer sequence,
        String name,
        Object latitude,
        Object longitude,
        Object altitude,
        Object speedToWaypoint,
        Double headingAtWaypoint,
        Double turnRadius,
        String hubId,
        StopoverType stopoverType,
        Integer groundTimeMinutes,
        Double payloadDeltaKg,
        Integer hoverDuration,
        Boolean waitForConfirmation,
        Map<String, Object> actions,
        Map<String, Object> conditions,
        WaypointType waypointType
) {
    public WaypointBlueprintVm(
            Integer sequence,
            String name,
            Object latitude,
            Object longitude,
            Object altitude,
            Object speedToWaypoint,
            Double headingAtWaypoint,
            Double turnRadius,
            String hubId,
            StopoverType stopoverType,
            Integer groundTimeMinutes,
            Double payloadDeltaKg,
            Integer hoverDuration,
            Boolean waitForConfirmation,
            Map<String, Object> actions,
            Map<String, Object> conditions
    ) {
        this(sequence, name, latitude, longitude, altitude, speedToWaypoint, headingAtWaypoint,
                turnRadius, hubId, stopoverType, groundTimeMinutes, payloadDeltaKg, hoverDuration,
                waitForConfirmation, actions, conditions, null);
    }
}
