package com.utm.emergency.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record HubListClientVm(
        List<HubLocationVm> items,
        long total
) {
}
