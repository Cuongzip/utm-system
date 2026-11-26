package com.utm.mission.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record HubListClientVm(
        List<HubBriefVm> items,
        long total
) {
}
