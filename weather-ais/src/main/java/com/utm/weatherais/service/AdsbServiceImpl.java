package com.utm.weatherais.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.weatherais.viewmodel.adsb.AdsbFeedVm;
import com.utm.weatherais.viewmodel.adsb.AdsbFeedVm.AdsbAircraftVm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AdsbServiceImpl implements AdsbService {

    private static final double FEET_TO_M = 0.3048;
    private static final double KNOT_TO_MS = 0.514444;
    private static final double FPM_TO_MS = 0.00508;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private record CenterPoint(double lat, double lon, int radiusNm) {
    }

    private final UpstreamHttpExecutor httpExecutor;
    private final String baseUrl;
    private final List<CenterPoint> centers;
    private final SingleFlightTtlCache<List<AdsbAircraftVm>> aircraftCache;

    public AdsbServiceImpl(
            UpstreamHttpExecutor httpExecutor,
            @Value("${utm.adsb.base-url:https://api.adsb.lol}") String baseUrl,
            @Value("${utm.adsb.centers:10.8188,106.6519,250;21.2212,105.8072,250}") String centersRaw,
            @Value("${utm.adsb.ttl-ms:3000}") long ttlMs) {
        this.httpExecutor = httpExecutor;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.centers = parseCenters(centersRaw);
        this.aircraftCache = new SingleFlightTtlCache<>(ttlMs);
    }

    @Override
    public AdsbFeedVm getAircraft() {
        List<AdsbAircraftVm> aircraft = aircraftCache.getOrLoad("adsb:live", this::fetchAllCenters, List::of);
        return new AdsbFeedVm(
                aircraft.size(),
                ZonedDateTime.now(ZoneOffset.UTC),
                "adsb.lol (ODbL)",
                "Data: adsb.lol contributors (ODbL 1.0)",
                aircraft
        );
    }

    private List<AdsbAircraftVm> fetchAllCenters() {
        Map<String, AdsbAircraftVm> deduplicated = new LinkedHashMap<>();
        boolean anySucceeded = false;

        for (CenterPoint c : centers) {
            String url = String.format(Locale.US, "%s/v2/point/%.4f/%.4f/%d", baseUrl, c.lat(), c.lon(), c.radiusNm());
            var bodyOpt = httpExecutor.getString(url, Map.of(), 5000);
            if (bodyOpt.isEmpty()) {
                continue;
            }
            try {
                JsonNode root = OBJECT_MAPPER.readTree(bodyOpt.get());
                JsonNode acList = root.get("ac");
                if (acList != null && acList.isArray()) {
                    anySucceeded = true;
                    for (JsonNode ac : acList) {
                        String hex = ac.path("hex").asText("").trim();
                        Double lat = ac.hasNonNull("lat") && ac.get("lat").isNumber() ? ac.get("lat").asDouble() : null;
                        Double lon = ac.hasNonNull("lon") && ac.get("lon").isNumber() ? ac.get("lon").asDouble() : null;
                        if (hex.isEmpty() || lat == null || lon == null) {
                            continue;
                        }
                        JsonNode altNode = ac.get("alt_baro");
                        boolean onGround = altNode != null && "ground".equalsIgnoreCase(altNode.asText());
                        Double altFt = (altNode != null && altNode.isNumber()) ? altNode.asDouble() : (onGround ? 0.0 : null);
                        Double altM = altFt != null ? Math.round(altFt * FEET_TO_M * 10.0) / 10.0 : null;

                        Double gsKt = ac.hasNonNull("gs") && ac.get("gs").isNumber() ? ac.get("gs").asDouble() : null;
                        Double gsMs = gsKt != null ? Math.round(gsKt * KNOT_TO_MS * 10.0) / 10.0 : null;

                        Double vRateFpm = ac.hasNonNull("baro_rate") && ac.get("baro_rate").isNumber()
                                ? ac.get("baro_rate").asDouble()
                                : null;
                        Double vRateMs = vRateFpm != null ? Math.round(vRateFpm * FPM_TO_MS * 100.0) / 100.0 : null;

                        Double track = ac.hasNonNull("track") && ac.get("track").isNumber() ? ac.get("track").asDouble() : null;
                        Double seen = ac.hasNonNull("seen") && ac.get("seen").isNumber() ? ac.get("seen").asDouble() : 0.0;

                        String flight = ac.path("flight").asText("").trim();
                        deduplicated.put(hex, new AdsbAircraftVm(
                                hex,
                                flight.isEmpty() ? hex.toUpperCase(Locale.ROOT) : flight,
                                ac.path("r").asText(null),
                                ac.path("t").asText(null),
                                lat,
                                lon,
                                altFt,
                                altM,
                                gsKt,
                                gsMs,
                                vRateFpm,
                                vRateMs,
                                track,
                                ac.path("squawk").asText(null),
                                onGround,
                                seen
                        ));
                    }
                }
            } catch (Exception ignored) {
            }
        }

        if (!anySucceeded) {
            throw new IllegalStateException("All ADS-B centers unreachable");
        }
        return new ArrayList<>(deduplicated.values());
    }

    private static List<CenterPoint> parseCenters(String raw) {
        List<CenterPoint> result = new ArrayList<>();
        if (raw != null && !raw.isBlank()) {
            for (String token : raw.split(";")) {
                String[] parts = token.trim().split(",");
                if (parts.length >= 3) {
                    try {
                        result.add(new CenterPoint(
                                Double.parseDouble(parts[0].trim()),
                                Double.parseDouble(parts[1].trim()),
                                Integer.parseInt(parts[2].trim())
                        ));
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
        }
        if (result.isEmpty()) {
            result.add(new CenterPoint(10.8188, 106.6519, 250));
        }
        return result;
    }
}
