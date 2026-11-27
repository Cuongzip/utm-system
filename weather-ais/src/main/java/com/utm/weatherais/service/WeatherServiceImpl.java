package com.utm.weatherais.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.utils.LocaleUtils;
import com.utm.weatherais.service.client.HubClientService;
import com.utm.weatherais.viewmodel.client.HubBriefVm;
import com.utm.weatherais.viewmodel.weather.CurrentWeatherVm;
import com.utm.weatherais.viewmodel.weather.MetarReportVm;
import com.utm.weatherais.viewmodel.weather.SigmetReportVm;
import com.utm.weatherais.viewmodel.weather.TafReportVm;
import com.utm.weatherais.viewmodel.weather.WeatherAlertVm;
import com.utm.weatherais.viewmodel.weather.WeatherForecastVm;
import com.utm.weatherais.viewmodel.weather.WeatherGoNoGoVm;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
public class WeatherServiceImpl implements WeatherService {

    private static final double KNOT_TO_MS = 0.514444;
    private static final double STATUTE_MILE_TO_M = 1609.34;
    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public record AerodromeCoord(String icao, String name, double lat, double lon) {
    }

    public static final List<AerodromeCoord> DEFAULT_AERODROMES = List.of(
            new AerodromeCoord("VVTS", "Tan Son Nhat International Airport", 10.8188, 106.6519),
            new AerodromeCoord("VVNB", "Noi Bai International Airport", 21.2212, 105.8072),
            new AerodromeCoord("VVDN", "Da Nang International Airport", 16.0439, 108.1994),
            new AerodromeCoord("VVCR", "Cam Ranh International Airport", 11.9982, 109.2194),
            new AerodromeCoord("VVPQ", "Phu Quoc International Airport", 10.1698, 103.9931),
            new AerodromeCoord("VVCI", "Cat Bi International Airport", 20.8194, 106.7250),
            new AerodromeCoord("VVPB", "Phu Bai International Airport", 16.4015, 107.7026),
            new AerodromeCoord("VVCT", "Can Tho International Airport", 10.0851, 105.7119)
    );

    private final HubClientService hubClientService;
    private final UpstreamHttpExecutor httpExecutor;
    private final String defaultIcaos;
    private final Set<String> defaultFirs;
    private final String awcBaseUrl;
    private final String openMeteoBaseUrl;

    private final SingleFlightTtlCache<List<MetarReportVm>> metarCache = new SingleFlightTtlCache<>(300_000L);
    private final SingleFlightTtlCache<List<TafReportVm>> tafCache = new SingleFlightTtlCache<>(900_000L);
    private final SingleFlightTtlCache<List<SigmetReportVm>> sigmetCache = new SingleFlightTtlCache<>(300_000L);
    private final SingleFlightTtlCache<CurrentWeatherVm> currentCache = new SingleFlightTtlCache<>(300_000L);
    private final SingleFlightTtlCache<WeatherForecastVm> forecastCache = new SingleFlightTtlCache<>(900_000L);

    public WeatherServiceImpl(
            HubClientService hubClientService,
            UpstreamHttpExecutor httpExecutor,
            @Value("${utm.weather.default-icaos:VVTS,VVNB,VVDN,VVCR,VVPQ,VVCI,VVPB,VVCT}") String defaultIcaos,
            @Value("${utm.weather.firs:VVHM,VVGL}") String defaultFirs,
            @Value("${utm.weather.awc-base-url:https://aviationweather.gov}") String awcBaseUrl,
            @Value("${utm.weather.open-meteo-base-url:https://api.open-meteo.com}") String openMeteoBaseUrl) {
        this.hubClientService = hubClientService;
        this.httpExecutor = httpExecutor;
        this.defaultIcaos = defaultIcaos;
        this.defaultFirs = Arrays.stream(defaultFirs.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toUpperCase(Locale.ROOT))
                .collect(Collectors.toSet());
        this.awcBaseUrl = awcBaseUrl.endsWith("/") ? awcBaseUrl.substring(0, awcBaseUrl.length() - 1) : awcBaseUrl;
        this.openMeteoBaseUrl = openMeteoBaseUrl.endsWith("/") ? openMeteoBaseUrl.substring(0, openMeteoBaseUrl.length() - 1) : openMeteoBaseUrl;
    }

    @Override
    public List<MetarReportVm> getMetar(String ids) {
        String normalizedIds = normalizeIcaoList(ids, defaultIcaos);
        return metarCache.getOrLoad("metar:" + normalizedIds, () -> fetchMetars(normalizedIds), List::of);
    }

    @Override
    public List<TafReportVm> getTaf(String ids) {
        String normalizedIds = normalizeIcaoList(ids, defaultIcaos);
        return tafCache.getOrLoad("taf:" + normalizedIds, () -> fetchTafs(normalizedIds), List::of);
    }

    @Override
    public List<SigmetReportVm> getSigmet(String fir) {
        Set<String> targetFirs = (fir != null && !fir.isBlank())
                ? Arrays.stream(fir.split(",")).map(s -> s.trim().toUpperCase(Locale.ROOT)).filter(s -> !s.isEmpty()).collect(Collectors.toSet())
                : defaultFirs;
        String cacheKey = "sigmet:" + String.join(",", targetFirs.stream().sorted().toList());
        return sigmetCache.getOrLoad(cacheKey, () -> fetchSigmets(targetFirs), List::of);
    }

    @Override
    public CurrentWeatherVm getCurrentWeather(String hubId) {
        HubBriefVm hub = requireHubWithCoordinates(hubId);
        return currentCache.getOrLoad(
                "current:" + hub.id() + ":" + LocaleUtils.currentLanguageTag(),
                () -> fetchOpenMeteoCurrent(hub),
                () -> buildFallbackCurrentWeather(hub));
    }

    @Override
    public WeatherForecastVm getForecast(String hubId) {
        HubBriefVm hub = requireHubWithCoordinates(hubId);
        return forecastCache.getOrLoad(
                "forecast:" + hub.id() + ":" + LocaleUtils.currentLanguageTag(),
                () -> fetchOpenMeteoForecast(hub),
                () -> new WeatherForecastVm(hub.id(), hub.name(), hub.location().lat(), hub.location().lng(), ZonedDateTime.now(ZoneOffset.UTC), List.of()));
    }

    @Override
    public List<WeatherAlertVm> getAlerts(String hubId) {
        CurrentWeatherVm current = getCurrentWeather(hubId);
        boolean vi = LocaleUtils.isVietnamese();
        List<WeatherAlertVm> alerts = new ArrayList<>();
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);

        if (current.windSpeedMs() != null) {
            if (current.windSpeedMs() > 12.0) {
                alerts.add(new WeatherAlertVm(
                        "HIGH_WIND",
                        "critical",
                        vi ? "Tốc độ gió vượt ngưỡng" : "Excessive Wind Speed",
                        vi
                                ? String.format(Locale.US, "Gió duy trì %.1f m/s vượt giới hạn an toàn Drone 12.0 m/s", current.windSpeedMs())
                                : String.format(Locale.US, "Sustained wind %.1f m/s exceeds 12.0 m/s drone limit", current.windSpeedMs()),
                        current.windSpeedMs(), 12.0, "m/s", now));
            } else if (current.windSpeedMs() > 9.0) {
                alerts.add(new WeatherAlertVm(
                        "HIGH_WIND",
                        "warning",
                        vi ? "Tốc độ gió cao" : "Elevated Wind Speed",
                        vi
                                ? String.format(Locale.US, "Gió duy trì %.1f m/s vượt ngưỡng cảnh báo 9.0 m/s", current.windSpeedMs())
                                : String.format(Locale.US, "Sustained wind %.1f m/s exceeds 9.0 m/s caution threshold", current.windSpeedMs()),
                        current.windSpeedMs(), 9.0, "m/s", now));
            }
        }

        if (current.windGustMs() != null) {
            if (current.windGustMs() > 15.0) {
                alerts.add(new WeatherAlertVm(
                        "WIND_GUST",
                        "critical",
                        vi ? "Gió giật mạnh nguy hiểm" : "Severe Wind Gusts",
                        vi
                                ? String.format(Locale.US, "Gió giật %.1f m/s vượt trần an toàn 15.0 m/s", current.windGustMs())
                                : String.format(Locale.US, "Wind gusts %.1f m/s exceed 15.0 m/s safety ceiling", current.windGustMs()),
                        current.windGustMs(), 15.0, "m/s", now));
            } else if (current.windGustMs() > 12.0) {
                alerts.add(new WeatherAlertVm(
                        "WIND_GUST",
                        "warning",
                        vi ? "Gió giật trung bình" : "Moderate Wind Gusts",
                        vi
                                ? String.format(Locale.US, "Gió giật %.1f m/s vượt ngưỡng cảnh báo 12.0 m/s", current.windGustMs())
                                : String.format(Locale.US, "Wind gusts %.1f m/s exceed 12.0 m/s caution threshold", current.windGustMs()),
                        current.windGustMs(), 12.0, "m/s", now));
            }
        }

        if (current.visibilityM() != null) {
            if (current.visibilityM() < 1500.0) {
                alerts.add(new WeatherAlertVm(
                        "LOW_VISIBILITY",
                        "critical",
                        vi ? "Tầm nhìn kém" : "Poor Visibility",
                        vi
                                ? String.format(Locale.US, "Tầm nhìn %.0f m thấp hơn mức tối thiểu VLOS 1500 m", current.visibilityM())
                                : String.format(Locale.US, "Visibility %.0f m is below 1500 m VLOS minimum", current.visibilityM()),
                        current.visibilityM(), 1500.0, "m", now));
            } else if (current.visibilityM() < 5000.0) {
                alerts.add(new WeatherAlertVm(
                        "LOW_VISIBILITY",
                        "warning",
                        vi ? "Tầm nhìn suy giảm" : "Reduced Visibility",
                        vi
                                ? String.format(Locale.US, "Tầm nhìn %.0f m thấp hơn tiêu chuẩn VFR 5000 m", current.visibilityM())
                                : String.format(Locale.US, "Visibility %.0f m is below 5000 m VFR standard", current.visibilityM()),
                        current.visibilityM(), 5000.0, "m", now));
            }
        }

        int code = current.weatherCode() != null ? current.weatherCode() : 0;
        if (code >= 95) {
            alerts.add(new WeatherAlertVm(
                    "THUNDERSTORM",
                    "critical",
                    vi ? "Hoạt động giông bão" : "Thunderstorm Activity",
                    vi ? "Ghi nhận giông bão đang hoạt động tại tọa độ Hub" : "Active thunderstorm reported at hub coordinates",
                    (double) code, 95.0, "WMO", now));
        } else if (code >= 63 && code <= 67) {
            alerts.add(new WeatherAlertVm(
                    "RAIN",
                    "warning",
                    vi ? "Mưa vừa đến mưa to" : "Moderate to Heavy Rain",
                    vi
                            ? "Lượng mưa có thể làm suy giảm cảm biến quang học và hiệu suất lực đẩy"
                            : "Precipitation may degrade optical sensors and propulsion efficiency",
                    current.precipitationMm(), 2.5, "mm", now));
        }

        return alerts;
    }

    @Override
    public WeatherGoNoGoVm getGoNoGo(String hubId) {
        HubBriefVm hub = requireHubWithCoordinates(hubId);
        double lat = hub.location().lat();
        double lon = hub.location().lng();

        AerodromeCoord nearest = findNearestAerodrome(lat, lon);
        double distanceKm = round1(haversineKm(lat, lon, nearest.lat(), nearest.lon()));

        List<MetarReportVm> metars = getMetar(nearest.icao());
        MetarReportVm metar = metars.isEmpty() ? null : metars.getFirst();
        CurrentWeatherVm current = getCurrentWeather(hubId);
        List<SigmetReportVm> sigmets = getSigmet(null);

        Double metarWind = metar != null ? metar.windSpeedMs() : null;
        Double curWind = current.windSpeedMs();
        final Double windMs;
        final String windSource;
        if (metarWind != null && curWind != null) {
            if (metarWind >= curWind) {
                windMs = metarWind;
                windSource = "METAR";
            } else {
                windMs = curWind;
                windSource = "Open-Meteo";
            }
        } else if (metarWind != null) {
            windMs = metarWind;
            windSource = "METAR";
        } else {
            windMs = curWind;
            windSource = "Open-Meteo";
        }

        Double metarGust = metar != null ? metar.windGustMs() : null;
        Double curGust = current.windGustMs();
        Double gustMs = (metarGust != null && curGust != null)
                ? Math.max(metarGust, curGust)
                : (metarGust != null ? metarGust : curGust);

        Integer windDir = "METAR".equals(windSource) && metar != null && metar.windDirectionDeg() != null
                ? metar.windDirectionDeg()
                : (current.windDirectionDeg() != null
                        ? current.windDirectionDeg()
                        : (metar != null ? metar.windDirectionDeg() : null));

        Double metarVis = metar != null ? metar.visibilityM() : null;
        Double curVis = current.visibilityM();
        Double visibilityM = (metarVis != null && curVis != null)
                ? Math.min(metarVis, curVis)
                : (metarVis != null ? metarVis : curVis);

        String flightCategory = worstFlightCategory(
                metar != null ? metar.flightCategory() : null,
                current.flightCategory());

        boolean vi = LocaleUtils.isVietnamese();
        List<String> noGoReasons = new ArrayList<>();
        List<String> cautionReasons = new ArrayList<>();

        if (windMs != null) {
            if (windMs > 12.0) {
                noGoReasons.add(vi
                        ? String.format(Locale.US, "Gió duy trì %.1f m/s vượt giới hạn 12.0 m/s (%s)", windMs, windSource)
                        : String.format(Locale.US, "Sustained wind %.1f m/s exceeds 12.0 m/s limit (%s)", windMs, windSource));
            } else if (windMs > 9.0) {
                cautionReasons.add(vi
                        ? String.format(Locale.US, "Gió duy trì %.1f m/s vượt ngưỡng cảnh báo 9.0 m/s (%s)", windMs, windSource)
                        : String.format(Locale.US, "Sustained wind %.1f m/s exceeds 9.0 m/s caution threshold (%s)", windMs, windSource));
            }
        }

        if (gustMs != null) {
            if (gustMs > 15.0) {
                noGoReasons.add(vi
                        ? String.format(Locale.US, "Gió giật %.1f m/s vượt giới hạn 15.0 m/s", gustMs)
                        : String.format(Locale.US, "Wind gusts %.1f m/s exceed 15.0 m/s limit", gustMs));
            } else if (gustMs > 12.0) {
                cautionReasons.add(vi
                        ? String.format(Locale.US, "Gió giật %.1f m/s vượt ngưỡng cảnh báo 12.0 m/s", gustMs)
                        : String.format(Locale.US, "Wind gusts %.1f m/s exceed 12.0 m/s caution threshold", gustMs));
            }
        }

        if (visibilityM != null) {
            if (visibilityM < 1500.0) {
                noGoReasons.add(vi
                        ? String.format(Locale.US, "Tầm nhìn %.0f m thấp hơn mức tối thiểu 1500 m", visibilityM)
                        : String.format(Locale.US, "Visibility %.0f m is below 1500 m minimum", visibilityM));
            } else if (visibilityM < 5000.0) {
                cautionReasons.add(vi
                        ? String.format(Locale.US, "Tầm nhìn %.0f m thấp hơn tiêu chuẩn VFR 5000 m", visibilityM)
                        : String.format(Locale.US, "Visibility %.0f m is below 5000 m VFR standard", visibilityM));
            }
        }

        if ("IFR".equalsIgnoreCase(flightCategory) || "LIFR".equalsIgnoreCase(flightCategory)) {
            noGoReasons.add(vi
                    ? "Phân loại điều kiện bay tại sân bay là " + flightCategory
                    : "Aerodrome flight category is " + flightCategory);
        } else if ("MVFR".equalsIgnoreCase(flightCategory)) {
            cautionReasons.add(vi
                    ? "Phân loại điều kiện bay tại sân bay là MVFR"
                    : "Aerodrome flight category is MVFR");
        }

        if (current.weatherCode() != null) {
            if (current.weatherCode() >= 95) {
                noGoReasons.add(vi
                        ? "Phát hiện hoạt động giông bão (mã WMO " + current.weatherCode() + ")"
                        : "Thunderstorm activity detected (WMO code " + current.weatherCode() + ")");
            } else if (current.weatherCode() >= 61) {
                cautionReasons.add(vi
                        ? "Đang có mưa tại khu vực Hub (" + describeWmoCode(current.weatherCode(), true) + ")"
                        : "Active precipitation at hub (" + describeWmoCode(current.weatherCode(), false) + ")");
            }
        }

        for (SigmetReportVm sigmet : sigmets) {
            String hazard = sigmet.hazard() != null ? sigmet.hazard().toUpperCase(Locale.ROOT) : "SIGMET";
            if (hazard.contains("TS") || hazard.contains("SEV") || hazard.contains("TC") || hazard.contains("VA")) {
                noGoReasons.add(vi
                        ? "SIGMET nguy hiểm đang hiệu lực trong FIR " + sigmet.firId() + " (" + hazard + ")"
                        : "Active severe SIGMET in FIR " + sigmet.firId() + " (" + hazard + ")");
            } else {
                cautionReasons.add(vi
                        ? "Khuyến cáo SIGMET đang hiệu lực trong FIR " + sigmet.firId() + " (" + hazard + ")"
                        : "Active SIGMET advisory in FIR " + sigmet.firId() + " (" + hazard + ")");
            }
        }

        String verdict;
        List<String> reasons = new ArrayList<>();
        if (!noGoReasons.isEmpty()) {
            verdict = "NO_GO";
            reasons.addAll(noGoReasons);
            reasons.addAll(cautionReasons);
        } else if (!cautionReasons.isEmpty()) {
            verdict = "CAUTION";
            reasons.addAll(cautionReasons);
        } else {
            verdict = "GO";
        }

        return new WeatherGoNoGoVm(
                hub.id(),
                hub.name(),
                verdict,
                windMs != null ? round1(windMs) : 0.0,
                gustMs != null ? round1(gustMs) : null,
                windDir,
                visibilityM,
                flightCategory != null ? flightCategory : "VFR",
                nearest.icao(),
                distanceKm,
                windSource,
                sigmets.size(),
                reasons,
                metar,
                current,
                ZonedDateTime.now(ZoneOffset.UTC)
        );
    }

    private List<MetarReportVm> fetchMetars(String normalizedIds) {
        String encoded = URLEncoder.encode(normalizedIds, StandardCharsets.UTF_8);
        String url = awcBaseUrl + "/api/data/metar?ids=" + encoded + "&format=json";
        String body = httpExecutor.getString(url, Map.of(), 7000)
                .orElseThrow(() -> new IllegalStateException("NOAA METAR unavailable"));
        try {
            JsonNode root = OBJECT_MAPPER.readTree(body);
            if (!root.isArray()) {
                return List.of();
            }
            List<MetarReportVm> list = new ArrayList<>();
            for (JsonNode node : root) {
                Double wspdKt = numberOrNull(node, "wspd");
                Double wgstKt = numberOrNull(node, "wgst");
                Double visibM = parseVisibilityMeters(node.get("visib"));

                List<String> clouds = new ArrayList<>();
                JsonNode cloudArr = node.get("clouds");
                if (cloudArr != null && cloudArr.isArray()) {
                    for (JsonNode c : cloudArr) {
                        String cover = textOrNull(c, "cover");
                        Integer base = intOrNull(c, "base");
                        if (cover != null) {
                            clouds.add(base != null ? cover + " " + base + "ft" : cover);
                        }
                    }
                }

                String fltCat = textOrNull(node, "fltCat");
                if (fltCat == null && visibM != null) {
                    fltCat = deriveFlightCategory(visibM, null);
                }

                list.add(new MetarReportVm(
                        textOrNull(node, "icaoId"),
                        textOrNull(node, "name"),
                        numberOrNull(node, "lat"),
                        numberOrNull(node, "lon"),
                        textOrNull(node, "rawOb"),
                        fltCat != null ? fltCat : "VFR",
                        numberOrNull(node, "temp"),
                        numberOrNull(node, "dewp"),
                        intOrNull(node, "wdir"),
                        wspdKt,
                        wspdKt != null ? round1(wspdKt * KNOT_TO_MS) : null,
                        wgstKt,
                        wgstKt != null ? round1(wgstKt * KNOT_TO_MS) : null,
                        visibM,
                        numberOrNull(node, "altim"),
                        clouds,
                        parseEpochOrIso(node.get("obsTime"), node.get("reportTime"))
                ));
            }
            return list;
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to parse NOAA METAR JSON", ex);
        }
    }

    private List<TafReportVm> fetchTafs(String normalizedIds) {
        String encoded = URLEncoder.encode(normalizedIds, StandardCharsets.UTF_8);
        String url = awcBaseUrl + "/api/data/taf?ids=" + encoded + "&format=json";
        String body = httpExecutor.getString(url, Map.of(), 7000)
                .orElseThrow(() -> new IllegalStateException("NOAA TAF unavailable"));
        try {
            JsonNode root = OBJECT_MAPPER.readTree(body);
            if (!root.isArray()) {
                return List.of();
            }
            List<TafReportVm> list = new ArrayList<>();
            for (JsonNode node : root) {
                list.add(new TafReportVm(
                        textOrNull(node, "icaoId"),
                        textOrNull(node, "name"),
                        numberOrNull(node, "lat"),
                        numberOrNull(node, "lon"),
                        textOrNull(node, "rawTAF"),
                        parseEpochOrIso(node.get("issueTime"), null),
                        parseEpochOrIso(node.get("validTimeFrom"), null),
                        parseEpochOrIso(node.get("validTimeTo"), null)
                ));
            }
            return list;
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to parse NOAA TAF JSON", ex);
        }
    }

    private List<SigmetReportVm> fetchSigmets(Set<String> firIds) {
        String url = awcBaseUrl + "/api/data/isigmet?format=json";
        String body = httpExecutor.getString(url, Map.of(), 8000)
                .orElseThrow(() -> new IllegalStateException("NOAA SIGMET unavailable"));
        try {
            JsonNode root = OBJECT_MAPPER.readTree(body);
            if (!root.isArray()) {
                return List.of();
            }
            List<SigmetReportVm> list = new ArrayList<>();
            for (JsonNode node : root) {
                String firId = textOrNull(node, "firId");
                if (firId == null) {
                    continue;
                }
                if (!firIds.isEmpty() && !firIds.contains(firId.toUpperCase(Locale.ROOT))) {
                    continue;
                }
                List<Map<String, Double>> coords = new ArrayList<>();
                JsonNode coordsNode = node.get("coords");
                if (coordsNode != null && coordsNode.isArray()) {
                    for (JsonNode pt : coordsNode) {
                        Double lat = numberOrNull(pt, "lat");
                        Double lon = numberOrNull(pt, "lon");
                        if (lat != null && lon != null) {
                            Map<String, Double> map = new LinkedHashMap<>();
                            map.put("lat", lat);
                            map.put("lon", lon);
                            coords.add(map);
                        }
                    }
                }
                String hazard = textOrNull(node, "hazard");
                String severity = (hazard != null && (hazard.contains("TS") || hazard.contains("TC") || hazard.contains("VA")))
                        ? "critical"
                        : "warning";
                list.add(new SigmetReportVm(
                        textOrNull(node, "isigmetId"),
                        firId,
                        textOrNull(node, "firName"),
                        hazard,
                        textOrNull(node, "qualifier"),
                        severity,
                        intOrNull(node, "base"),
                        intOrNull(node, "top"),
                        textOrNull(node, "rawSigmet"),
                        parseEpochOrIso(node.get("validTimeFrom"), null),
                        parseEpochOrIso(node.get("validTimeTo"), null),
                        coords
                ));
            }
            return list;
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to parse NOAA SIGMET JSON", ex);
        }
    }

    private CurrentWeatherVm fetchOpenMeteoCurrent(HubBriefVm hub) {
        double lat = hub.location().lat();
        double lon = hub.location().lng();
        String url = String.format(Locale.US,
                "%s/v1/forecast?latitude=%.5f&longitude=%.5f&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility&wind_speed_unit=ms",
                openMeteoBaseUrl, lat, lon);
        String body = httpExecutor.getString(url, Map.of(), 7000)
                .orElseThrow(() -> new IllegalStateException("Open-Meteo current weather unavailable"));
        try {
            JsonNode root = OBJECT_MAPPER.readTree(body);
            JsonNode cur = root.path("current");
            Double tempC = numberOrNull(cur, "temperature_2m");
            Double appTempC = numberOrNull(cur, "apparent_temperature");
            Integer humidity = intOrNull(cur, "relative_humidity_2m");
            Double windMs = numberOrNull(cur, "wind_speed_10m");
            Double gustMs = numberOrNull(cur, "wind_gusts_10m");
            Integer windDir = intOrNull(cur, "wind_direction_10m");
            Double visM = numberOrNull(cur, "visibility");
            Integer clouds = intOrNull(cur, "cloud_cover");
            Double pressure = numberOrNull(cur, "surface_pressure");
            Double precip = numberOrNull(cur, "precipitation");
            Integer code = intOrNull(cur, "weather_code");

            String flightCat = deriveFlightCategory(visM != null ? visM : 10000.0, clouds);
            String flightCond = deriveFlightConditions(windMs, gustMs, visM, code);

            return new CurrentWeatherVm(
                    hub.id(),
                    hub.name(),
                    lat,
                    lon,
                    tempC,
                    appTempC,
                    humidity,
                    windMs,
                    gustMs,
                    windDir,
                    visM != null ? visM : 10000.0,
                    clouds,
                    pressure,
                    precip,
                    code,
                    describeWmoCode(code),
                    flightCat,
                    flightCond,
                    ZonedDateTime.now(ZoneOffset.UTC)
            );
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to parse Open-Meteo current JSON", ex);
        }
    }

    private WeatherForecastVm fetchOpenMeteoForecast(HubBriefVm hub) {
        double lat = hub.location().lat();
        double lon = hub.location().lng();
        String url = String.format(Locale.US,
                "%s/v1/forecast?latitude=%.5f&longitude=%.5f&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=ms&forecast_hours=48",
                openMeteoBaseUrl, lat, lon);
        String body = httpExecutor.getString(url, Map.of(), 7000)
                .orElseThrow(() -> new IllegalStateException("Open-Meteo forecast unavailable"));
        try {
            JsonNode root = OBJECT_MAPPER.readTree(body);
            JsonNode hourly = root.path("hourly");
            JsonNode times = hourly.path("time");
            List<WeatherForecastVm.ForecastHourVm> items = new ArrayList<>();
            if (times.isArray()) {
                int len = Math.min(48, times.size());
                for (int i = 0; i < len; i++) {
                    Double windMs = arrayDouble(hourly.get("wind_speed_10m"), i);
                    Double gustMs = arrayDouble(hourly.get("wind_gusts_10m"), i);
                    Double visM = arrayDouble(hourly.get("visibility"), i);
                    Integer code = arrayInt(hourly.get("weather_code"), i);
                    items.add(new WeatherForecastVm.ForecastHourVm(
                            times.get(i).asText(),
                            arrayDouble(hourly.get("temperature_2m"), i),
                            arrayInt(hourly.get("relative_humidity_2m"), i),
                            windMs,
                            gustMs,
                            arrayInt(hourly.get("wind_direction_10m"), i),
                            arrayDouble(hourly.get("precipitation_probability"), i),
                            arrayDouble(hourly.get("precipitation"), i),
                            visM,
                            arrayInt(hourly.get("cloud_cover"), i),
                            code,
                            describeWmoCode(code),
                            deriveFlightConditions(windMs, gustMs, visM, code)
                    ));
                }
            }
            return new WeatherForecastVm(hub.id(), hub.name(), lat, lon, ZonedDateTime.now(ZoneOffset.UTC), items);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to parse Open-Meteo forecast JSON", ex);
        }
    }

    private HubBriefVm requireHubWithCoordinates(String hubId) {
        HubBriefVm hub = hubClientService.getHubById(hubId)
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", hubId));
        if (hub.location() == null || hub.location().lat() == null || hub.location().lng() == null) {
            throw new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", hubId);
        }
        return hub;
    }

    private CurrentWeatherVm buildFallbackCurrentWeather(HubBriefVm hub) {
        boolean vi = LocaleUtils.isVietnamese();
        return new CurrentWeatherVm(
                hub.id(),
                hub.name(),
                hub.location().lat(),
                hub.location().lng(),
                28.0,
                30.0,
                70,
                3.0,
                4.5,
                180,
                10000.0,
                25,
                1012.0,
                0.0,
                1,
                vi ? "Trời quang đến ít mây (dự phòng)" : "Mainly clear (fallback)",
                "VFR",
                "OPTIMAL",
                ZonedDateTime.now(ZoneOffset.UTC)
        );
    }

    public static AerodromeCoord findNearestAerodrome(double lat, double lon) {
        return DEFAULT_AERODROMES.stream()
                .min(Comparator.comparingDouble(a -> haversineKm(lat, lon, a.lat(), a.lon())))
                .orElse(DEFAULT_AERODROMES.getFirst());
    }

    public static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private static String normalizeIcaoList(String ids, String fallback) {
        String source = (ids != null && !ids.isBlank()) ? ids : fallback;
        return Arrays.stream(source.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toUpperCase(Locale.ROOT))
                .distinct()
                .collect(Collectors.joining(","));
    }

    private static String deriveFlightCategory(double visibilityM, Integer cloudCoverPct) {
        if (visibilityM < 1600.0) {
            return "LIFR";
        }
        if (visibilityM < 4800.0) {
            return "IFR";
        }
        if (visibilityM <= 8000.0) {
            return "MVFR";
        }
        return "VFR";
    }

    private static String worstFlightCategory(String first, String second) {
        if (first == null || first.isBlank()) {
            return second != null && !second.isBlank() ? second : "VFR";
        }
        if (second == null || second.isBlank()) {
            return first;
        }
        return flightCategorySeverityRank(first) >= flightCategorySeverityRank(second) ? first : second;
    }

    private static int flightCategorySeverityRank(String cat) {
        if (cat == null) return 0;
        return switch (cat.trim().toUpperCase(Locale.ROOT)) {
            case "LIFR" -> 3;
            case "IFR" -> 2;
            case "MVFR" -> 1;
            default -> 0;
        };
    }

    private static String deriveFlightConditions(Double windMs, Double gustMs, Double visM, Integer code) {
        double w = windMs != null ? windMs : 0.0;
        double g = gustMs != null ? gustMs : 0.0;
        double v = visM != null ? visM : 10000.0;
        int c = code != null ? code : 0;
        if (w > 12.0 || g > 15.0 || v < 1500.0 || c >= 95) {
            return "UNSAFE";
        }
        if (w > 9.0 || g > 12.0 || v < 5000.0 || c >= 61) {
            return "MARGINAL";
        }
        if (w > 5.0 || g > 8.0 || c >= 3) {
            return "ACCEPTABLE";
        }
        return "OPTIMAL";
    }

    private static String describeWmoCode(Integer code) {
        return describeWmoCode(code, LocaleUtils.isVietnamese());
    }

    private static String describeWmoCode(Integer code, boolean vi) {
        if (code == null) {
            return vi ? "Không xác định" : "Unknown";
        }
        if (vi) {
            return switch (code) {
                case 0 -> "Trời quang";
                case 1, 2, 3 -> "Ít mây đến có mây";
                case 45, 48 -> "Sương mù";
                case 51, 53, 55 -> "Mưa phùn";
                case 61, 63, 65 -> "Mưa";
                case 71, 73, 75 -> "Tuyết rơi";
                case 80, 81, 82 -> "Mưa rào";
                case 95, 96, 99 -> "Giông bão";
                default -> "Mã thời tiết " + code;
            };
        }
        return switch (code) {
            case 0 -> "Clear sky";
            case 1, 2, 3 -> "Partly cloudy";
            case 45, 48 -> "Fog";
            case 51, 53, 55 -> "Drizzle";
            case 61, 63, 65 -> "Rain";
            case 71, 73, 75 -> "Snowfall";
            case 80, 81, 82 -> "Rain showers";
            case 95, 96, 99 -> "Thunderstorm";
            default -> "Weather code " + code;
        };
    }

    private static Double parseVisibilityMeters(JsonNode node) {
        if (node == null || node.isNull()) return null;
        if (node.isNumber()) return round1(node.asDouble() * STATUTE_MILE_TO_M);
        String raw = node.asText().trim();
        if (raw.isEmpty()) return null;
        boolean unlimitedPlus = raw.endsWith("+");
        String numeric = unlimitedPlus ? raw.substring(0, raw.length() - 1).trim() : raw;
        try {
            double sm = Double.parseDouble(numeric);
            if (unlimitedPlus && sm >= 6.0) {
                return 10000.0;
            }
            return round1(sm * STATUTE_MILE_TO_M);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static ZonedDateTime parseEpochOrIso(JsonNode primary, JsonNode secondary) {
        for (JsonNode n : new JsonNode[]{primary, secondary}) {
            if (n == null || n.isNull()) continue;
            if (n.isNumber()) {
                return Instant.ofEpochSecond(n.asLong()).atZone(ZoneOffset.UTC);
            }
            try {
                return ZonedDateTime.parse(n.asText());
            } catch (Exception ignored) {
            }
        }
        return ZonedDateTime.now(ZoneOffset.UTC);
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return (v != null && !v.isNull() && !v.asText().isBlank()) ? v.asText() : null;
    }

    private static Double numberOrNull(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return (v != null && v.isNumber()) ? v.asDouble() : null;
    }

    private static Integer intOrNull(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return (v != null && v.isNumber()) ? v.asInt() : null;
    }

    private static Double arrayDouble(JsonNode arr, int idx) {
        return (arr != null && arr.isArray() && idx < arr.size() && arr.get(idx).isNumber()) ? arr.get(idx).asDouble() : null;
    }

    private static Integer arrayInt(JsonNode arr, int idx) {
        return (arr != null && arr.isArray() && idx < arr.size() && arr.get(idx).isNumber()) ? arr.get(idx).asInt() : null;
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
