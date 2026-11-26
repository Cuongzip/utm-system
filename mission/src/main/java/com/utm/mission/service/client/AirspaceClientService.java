package com.utm.mission.service.client;

import java.util.List;
import java.util.Optional;

public interface AirspaceClientService {

    Optional<String> checkPointSafety(Double lat, Double lon, Double alt);

    default List<String> checkPathSafety(List<double[]> latLonAltPoints) {
        return List.of();
    }
}
