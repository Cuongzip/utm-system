package com.utm.conflict.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FlightListBriefVm(
        List<FlightBriefVm> items,
        long total
) {
}

