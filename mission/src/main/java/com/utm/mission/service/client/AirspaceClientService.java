package com.utm.mission.service.client;

import java.util.Optional;

public interface AirspaceClientService {

    Optional<String> checkPointSafety(Double lat, Double lon, Double alt);
}
