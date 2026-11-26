package com.utm.weatherais.viewmodel.adsb;

import java.time.ZonedDateTime;
import java.util.List;

public record AdsbFeedVm(
        int count,
        ZonedDateTime updatedAt,
        String source,
        String attribution,
        List<AdsbAircraftVm> aircraft
) {
    public record AdsbAircraftVm(
            String hex,
            String callsign,
            String registration,
            String aircraftType,
            Double latitude,
            Double longitude,
            Double altitudeFt,
            Double altitudeM,
            Double groundSpeedKt,
            Double groundSpeedMs,
            Double verticalRateFpm,
            Double verticalSpeedMs,
            Double headingDeg,
            String squawk,
            boolean onGround,
            Double seenSecondsAgo
    ) {
    }
}
