package com.utm.hub.viewmodel.hub;

import com.utm.hub.model.enumeration.HubStatus;

import java.time.ZonedDateTime;

public record HubOperationalStatusVm(
        String id,
        String code,
        String name,
        HubStatus status,
        int maxSimultaneousDrones,
        int stationedDronesCount,
        int activeFlightsCount,
        int availableCapacity,
        double utilizationPct,
        ZonedDateTime evaluatedAt
) {
}
