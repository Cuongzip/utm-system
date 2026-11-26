package com.utm.emergency.service.client;

import com.utm.emergency.config.ServiceUrlConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
@Slf4j
public class WeatherAisClientServiceImpl implements WeatherAisClientService {

    private static final long CACHE_TTL_MS = 3_000L;

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;
    private final AtomicReference<CachedAircraft> cache = new AtomicReference<>();

    @Override
    public List<AdsbAircraftBriefVm> getLiveAircraft() {
        long now = System.currentTimeMillis();
        CachedAircraft cached = cache.get();
        if (cached != null && (now - cached.fetchedAtMs()) < CACHE_TTL_MS) {
            return cached.aircraft();
        }
        try {
            AdsbFeedClientVm feed = restClient.get()
                    .uri(serviceUrlConfig.getWeatherAisUrl() + "/api/v1/adsb/aircraft")
                    .retrieve()
                    .body(AdsbFeedClientVm.class);
            List<AdsbAircraftBriefVm> list = feed != null && feed.aircraft() != null ? feed.aircraft() : List.of();
            cache.set(new CachedAircraft(list, now));
            return list;
        } catch (Exception ex) {
            log.debug("ADS-B proximity feed unavailable from weather-ais: {}", ex.getMessage());
            return cached != null ? cached.aircraft() : List.of();
        }
    }

    private record CachedAircraft(List<AdsbAircraftBriefVm> aircraft, long fetchedAtMs) {
    }
}
