package com.utm.emergency.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record HubLocationVm(
        String id,
        String code,
        String name,
        @JsonAlias({"lat", "latitude"}) Double latitude,
        @JsonAlias({"lon", "lng", "longitude"}) Double longitude,
        String status,
        Location location
) {
    public HubLocationVm(
            String id,
            String code,
            String name,
            Double latitude,
            Double longitude,
            String status
    ) {
        this(id, code, name, latitude, longitude, status, null);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Location(
            @JsonAlias({"lat", "latitude"}) Double latitude,
            @JsonAlias({"lon", "lng", "longitude"}) Double longitude
    ) {
    }

    @Override
    public Double latitude() {
        if (latitude != null) {
            return latitude;
        }
        return location != null ? location.latitude() : null;
    }

    @Override
    public Double longitude() {
        if (longitude != null) {
            return longitude;
        }
        return location != null ? location.longitude() : null;
    }
}
