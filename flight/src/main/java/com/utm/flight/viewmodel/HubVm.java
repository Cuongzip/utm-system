package com.utm.flight.viewmodel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record HubVm(
        String id,
        String name,
        String code,
        Double latitude,
        Double longitude,
        Double altitude,
        Double altitudeMsl,
        Location location
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Location(Double lat, Double lng) {}

    public Double latitude() {
        if (latitude != null) return latitude;
        if (location != null && location.lat() != null) return location.lat();
        return null;
    }

    public Double longitude() {
        if (longitude != null) return longitude;
        if (location != null && location.lng() != null) return location.lng();
        return null;
    }

    public Double altitude() {
        if (altitude != null) return altitude;
        if (altitudeMsl != null) return altitudeMsl;
        return 0.0;
    }
}

