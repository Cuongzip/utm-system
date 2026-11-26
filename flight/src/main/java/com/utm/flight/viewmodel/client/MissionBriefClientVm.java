package com.utm.flight.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MissionBriefClientVm(
        String id,
        String code,
        String name,
        Double payloadWeightKg,
        String departureHubId,
        String arrivalHubId,
        Double estimatedDistance,
        Integer estimatedDuration,
        List<MissionWaypointItemVm> waypoints
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MissionWaypointItemVm(
            Integer sequence,
            Double latitude,
            Double longitude,
            Double altitude,
            Integer hoverDurationSec
    ) {
    }
}
