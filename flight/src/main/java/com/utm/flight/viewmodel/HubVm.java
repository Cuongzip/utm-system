package com.utm.flight.viewmodel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record HubVm(
        String id,
        String name,
        String code,
        Double latitude,
        Double longitude,
        Double altitude
) {
}
