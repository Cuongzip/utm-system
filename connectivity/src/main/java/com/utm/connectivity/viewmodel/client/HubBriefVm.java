package com.utm.connectivity.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record HubBriefVm(
        String id,
        String code,
        String name,
        String status
) {
}
