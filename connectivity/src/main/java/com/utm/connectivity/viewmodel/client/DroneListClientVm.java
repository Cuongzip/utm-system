package com.utm.connectivity.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DroneListClientVm(
        List<DroneBriefVm> items,
        long total
) {
}
