package com.utm.mission.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DroneListClientVm(
        List<DroneBriefVm> items,
        long total
) {
}
