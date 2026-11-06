package com.utm.hub.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FlightListClientVm(
        List<FlightBriefClientVm> items,
        long total
) {
}

