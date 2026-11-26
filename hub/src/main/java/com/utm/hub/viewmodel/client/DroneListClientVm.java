package com.utm.hub.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DroneListClientVm(
        List<DroneBriefItemVm> items,
        long total
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DroneBriefItemVm(
            String id,
            String currentHubId,
            String status
    ) {
    }
}
