package com.utm.emergency.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record HubLocationVm(
        String id,
        String code,
        String name,
        Double latitude,
        Double longitude,
        String status) {
}
