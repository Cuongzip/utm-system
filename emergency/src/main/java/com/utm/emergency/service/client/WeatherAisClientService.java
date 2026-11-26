package com.utm.emergency.service.client;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

public interface WeatherAisClientService {

    List<AdsbAircraftBriefVm> getLiveAircraft();

    @JsonIgnoreProperties(ignoreUnknown = true)
    record AdsbFeedClientVm(
            List<AdsbAircraftBriefVm> aircraft
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record AdsbAircraftBriefVm(
            String hex,
            String callsign,
            @JsonAlias("lat") Double latitude,
            @JsonAlias("lon") Double longitude,
            Double altitudeM,
            Double altitudeFt,
            Boolean onGround
    ) {
        public Double effectiveAltitudeM() {
            if (altitudeM != null) {
                return altitudeM;
            }
            return altitudeFt != null ? altitudeFt * 0.3048 : null;
        }
    }
}
