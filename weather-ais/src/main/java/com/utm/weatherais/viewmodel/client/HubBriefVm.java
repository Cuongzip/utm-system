package com.utm.weatherais.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record HubBriefVm(
        String id,
        String code,
        String name,
        LocationVm location,
        Double altitudeMsl,
        String status
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LocationVm(
            @JsonAlias("latitude") Double lat,
            @JsonAlias("longitude") Double lng,
            String address
    ) {
    }
}
