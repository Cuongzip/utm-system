package com.utm.intelligence.service;

import com.utm.commonlibrary.ai.LlmReasoningClient;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.utils.LocaleUtils;
import com.utm.intelligence.service.client.IntelligenceInteropClientService;
import com.utm.intelligence.viewmodel.IntelligenceDtos.AdsbAircraftClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.AiAssessmentDecisionVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.AirspaceCheckPathClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.BriefingRouteVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.BriefingSectionsVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.FlightAssessmentVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.FlightBriefingVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.FlightClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.HubClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.NotamItemClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.RoutePointVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.WeatherGoNoGoClientVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
@Slf4j
public class BriefingService {

    private static final double EARTH_RADIUS_M = 6371000.0;
    private static final double METERS_PER_NM = 1852.0;

    private final IntelligenceInteropClientService interopClient;
    private final LlmReasoningClient llmReasoningClient;

    public FlightBriefingVm getFlightBriefing(String flightId) {
        FlightClientVm flight = interopClient.getFlightById(flightId)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", flightId));

        HubClientVm depHub = flight.departureHubId() != null
                ? interopClient.getHubById(flight.departureHubId()).orElse(null)
                : null;
        HubClientVm arrHub = flight.arrivalHubId() != null
                ? interopClient.getHubById(flight.arrivalHubId()).orElse(null)
                : null;

        double altM = flight.maxAltitudeM() != null
                ? flight.maxAltitudeM()
                : (flight.cruisingAltitudeM() != null ? flight.cruisingAltitudeM() : 120.0);
        List<RoutePointVm> routePoints = extractRoutePoints(flight, depHub, arrHub, altM);

        SecurityContext callerContext = SecurityContextHolder.getContext();
        Locale callerLocale = LocaleUtils.currentLocale();
        CompletableFuture<Optional<WeatherGoNoGoClientVm>> weatherFuture = CompletableFuture.supplyAsync(
                withExecutionContext(callerContext, callerLocale,
                        () -> flight.departureHubId() != null ? interopClient.getWeatherGoNoGo(flight.departureHubId()) : Optional.empty()));
        CompletableFuture<Optional<AirspaceCheckPathClientVm>> airspaceFuture = CompletableFuture.supplyAsync(
                withExecutionContext(callerContext, callerLocale,
                        () -> routePoints.isEmpty() ? Optional.empty() : interopClient.checkAirspacePath(routePoints)));
        CompletableFuture<List<AdsbAircraftClientVm>> adsbFuture = CompletableFuture.supplyAsync(
                withExecutionContext(callerContext, callerLocale, interopClient::getAdsbAircraft));
        CompletableFuture<List<NotamItemClientVm>> notamFuture = CompletableFuture.supplyAsync(
                withExecutionContext(callerContext, callerLocale, interopClient::getNotams));

        CompletableFuture.allOf(weatherFuture, airspaceFuture, adsbFuture, notamFuture).join();

        int[] verdictRank = new int[] { 0 }; // 0=GREEN, 1=AMBER, 2=RED

        Map<String, Object> weatherSection = buildWeatherSection(weatherFuture.join(), verdictRank);
        Map<String, Object> airspaceSection = buildAirspaceSection(airspaceFuture.join(), verdictRank);
        Map<String, Object> trafficSection = buildTrafficSection(routePoints, adsbFuture.join(), verdictRank);
        Map<String, Object> notamSection = buildNotamSection(routePoints, altM, notamFuture.join(), verdictRank);

        String verdict = verdictRank[0] == 2 ? "RED" : (verdictRank[0] == 1 ? "AMBER" : "GREEN");

        return new FlightBriefingVm(
                flight.id(),
                flight.flightNumber(),
                verdict,
                new BriefingRouteVm(
                        depHub != null ? depHub.name() : flight.departureHubId(),
                        arrHub != null ? arrHub.name() : flight.arrivalHubId(),
                        routePoints,
                        altM),
                new BriefingSectionsVm(weatherSection, airspaceSection, trafficSection, notamSection),
                ZonedDateTime.now().toString());
    }

    public FlightAssessmentVm assessFlight(String flightId) {
        FlightBriefingVm briefing = getFlightBriefing(flightId);
        boolean aiEnabled = llmReasoningClient != null && llmReasoningClient.isEnabled();
        boolean vi = LocaleUtils.isVietnamese();

        AiAssessmentDecisionVm decision = null;
        if (aiEnabled) {
            String system = "You are a UAS pre-flight authorization officer for DROPS-UTM Vietnam. "
                    + "Reason over the deterministic evidence and return JSON with keys: "
                    + "decision (GO | GO_WITH_CONDITIONS | NO_GO), confidence (low | medium | high), "
                    + "blockingReasons (array of strings), conditions (array of strings), humanSummary (1-3 sentences). "
                    + "Any RED deterministic verdict, prohibited airspace breach, or NO_GO weather MUST be NO_GO."
                    + (vi
                            ? " Write blockingReasons, conditions, and humanSummary in concise, professional civil-aviation Vietnamese (Tiếng Việt), while keeping decision (GO | GO_WITH_CONDITIONS | NO_GO) and confidence (low | medium | high) enum values strictly in English."
                            : "");
            String user = String.format(
                    "Flight=%s, DeterministicVerdict=%s, Weather=%s, Airspace=%s, Traffic=%s, NOTAM=%s",
                    briefing.flightNumber(),
                    briefing.verdict(),
                    briefing.sections().weather(),
                    briefing.sections().airspace(),
                    briefing.sections().traffic(),
                    briefing.sections().notam());
            decision = llmReasoningClient.generateStructuredJson(system, user, AiAssessmentDecisionVm.class, 1024)
                    .orElse(null);
        }

        if (decision == null) {
            decision = buildDeterministicAssessment(briefing);
        }

        return new FlightAssessmentVm(
                briefing.flightId(),
                briefing.flightNumber(),
                aiEnabled,
                briefing.verdict(),
                llmReasoningClient != null ? llmReasoningClient.getDefaultModel() : "deterministic-rules",
                decision,
                briefing,
                ZonedDateTime.now().toString());
    }

    private AiAssessmentDecisionVm buildDeterministicAssessment(FlightBriefingVm briefing) {
        boolean vi = LocaleUtils.isVietnamese();
        List<String> blocking = new ArrayList<>();
        List<String> conditions = new ArrayList<>();

        Map<String, Object> wx = briefing.sections().weather();
        if ("NO_GO".equalsIgnoreCase(String.valueOf(wx.get("verdict")))) {
            blocking.add(vi
                    ? "Kết luận thời tiết tại trạm " + wx.get("icao") + " là NO_GO (gió " + wx.get("windMs") + " m/s)."
                    : "Weather verdict at station " + wx.get("icao") + " is NO_GO (wind " + wx.get("windMs") + " m/s).");
        } else if ("CAUTION".equalsIgnoreCase(String.valueOf(wx.get("verdict"))) || !"ok".equals(wx.get("status"))) {
            conditions.add(vi
                    ? "Theo dõi chặt chẽ tốc độ gió bề mặt và cập nhật tầm nhìn dọc hành lang khởi hành."
                    : "Monitor local surface winds and visibility updates along departure corridor.");
        }

        Map<String, Object> air = briefing.sections().airspace();
        int breachCount = air.get("breachCount") instanceof Number n ? n.intValue() : 0;
        String worst = String.valueOf(air.get("worstSeverity"));
        if ("critical".equalsIgnoreCase(worst)) {
            blocking.add(vi
                    ? "Lộ trình bay cắt qua " + breachCount + " vùng không phận cấm/hạn chế bay nghiêm trọng."
                    : "Flight path intersects " + breachCount + " critical prohibited/no-fly airspace zone(s).");
        } else if (breachCount > 0) {
            conditions.add(vi
                    ? "Phối hợp huấn lệnh ATC khi bay qua " + breachCount + " vùng không phận hạn chế/khuyến cáo."
                    : "Coordinate ATC clearance through " + breachCount + " restricted/advisory zone(s).");
        }

        Map<String, Object> traffic = briefing.sections().traffic();
        int warnTraffic = traffic.get("warningCount") instanceof Number n ? n.intValue() : 0;
        int cautTraffic = traffic.get("cautionCount") instanceof Number n ? n.intValue() : 0;
        if (warnTraffic > 0) {
            blocking.add(vi
                    ? "Có " + warnTraffic + " tàu bay có người lái tầm thấp trong phạm vi 1.5 NM quanh lộ trình dự kiến."
                    : warnTraffic + " low-altitude manned aircraft within 1.5 NM of planned route.");
        } else if (cautTraffic > 0) {
            conditions.add(vi
                    ? "Có " + cautTraffic + " tàu bay có người lái trong phạm vi 3.0 NM; duy trì giám sát ADS-B liên tục."
                    : cautTraffic + " manned aircraft within 3.0 NM; maintain active ADS-B monitoring.");
        }

        if ("RED".equals(briefing.verdict()) || !blocking.isEmpty()) {
            return new AiAssessmentDecisionVm(
                    "NO_GO",
                    "high",
                    blocking,
                    conditions,
                    vi
                            ? "Chốt chặn an toàn trước chuyến bay từ chối cấp phép cho " + briefing.flightNumber() + ": " + String.join(" ", blocking)
                            : "Pre-flight safety gates blocked authorization for " + briefing.flightNumber() + ": " + String.join(" ", blocking));
        }
        if ("AMBER".equals(briefing.verdict()) || !conditions.isEmpty()) {
            return new AiAssessmentDecisionVm(
                    "GO_WITH_CONDITIONS",
                    "high",
                    List.of(),
                    conditions,
                    vi
                            ? "Chuyến bay " + briefing.flightNumber() + " có thể thực hiện kèm biện pháp giảm thiểu rủi ro vận hành: " + String.join(" ", conditions)
                            : "Flight " + briefing.flightNumber() + " may proceed with operational mitigations: " + String.join(" ", conditions));
        }
        return new AiAssessmentDecisionVm(
                "GO",
                "high",
                List.of(),
                List.of(),
                vi
                        ? "Tất cả kiểm tra thời tiết, hàng rào địa lý không phận, lưu lượng ADS-B và NOTAM đều an toàn cho chuyến bay " + briefing.flightNumber() + "."
                        : "All weather, airspace geofence, ADS-B traffic, and NOTAM checks are clear for flight " + briefing.flightNumber() + ".");
    }

    private List<RoutePointVm> extractRoutePoints(FlightClientVm flight, HubClientVm dep, HubClientVm arr, double altM) {
        List<RoutePointVm> pts = new ArrayList<>();
        if (flight.plannedRoute() != null && flight.plannedRoute().coordinates() != null) {
            for (List<Double> c : flight.plannedRoute().coordinates()) {
                if (c != null && c.size() >= 2 && c.get(0) != null && c.get(1) != null) {
                    double ptAlt = c.size() > 2 && c.get(2) != null ? c.get(2) : altM;
                    pts.add(new RoutePointVm(c.get(1), c.get(0), ptAlt));
                }
            }
        }
        if (pts.isEmpty()) {
            if (dep != null && dep.latitude() != null && dep.longitude() != null) {
                pts.add(new RoutePointVm(dep.latitude(), dep.longitude(), altM));
            }
            if (arr != null && arr.latitude() != null && arr.longitude() != null) {
                pts.add(new RoutePointVm(arr.latitude(), arr.longitude(), altM));
            }
        }
        return pts;
    }

    private Map<String, Object> buildWeatherSection(Optional<WeatherGoNoGoClientVm> wxOpt, int[] rank) {
        if (wxOpt.isEmpty()) {
            raise(rank, 1);
            return Map.of("status", "unavailable");
        }
        WeatherGoNoGoClientVm w = wxOpt.get();
        String v = w.verdict() != null ? w.verdict().toUpperCase(Locale.ROOT) : "GO";
        if ("NO_GO".equals(v)) {
            raise(rank, 2);
        } else if ("CAUTION".equals(v) || "MARGINAL".equals(v)) {
            raise(rank, 1);
        }
        Map<String, Object> section = new LinkedHashMap<>();
        section.put("status", "ok");
        section.put("verdict", v);
        section.put("flightCategory", w.flightCategory());
        section.put("windMs", w.windSpeedMs());
        section.put("icao", w.nearestStation());
        section.put("reasons", w.reasons() != null ? w.reasons() : List.of());
        return section;
    }

    private Map<String, Object> buildAirspaceSection(Optional<AirspaceCheckPathClientVm> airOpt, int[] rank) {
        if (airOpt.isEmpty()) {
            raise(rank, 1);
            return Map.of("status", "unavailable");
        }
        AirspaceCheckPathClientVm a = airOpt.get();
        List<Map<String, Object>> violations = a.violations() != null ? a.violations() : List.of();
        String worst = "none";
        for (Map<String, Object> b : violations) {
            String sev = String.valueOf(b.getOrDefault("severity", "warning")).toLowerCase(Locale.ROOT);
            String zt = String.valueOf(b.getOrDefault("zoneType", "")).toLowerCase(Locale.ROOT);
            if ("critical".equals(sev) || "prohibited".equals(sev)
                    || "no_fly".equals(zt) || "no_fly_zone".equals(zt)
                    || "prohibited".equals(zt) || "emergency_exclusion".equals(zt)) {
                worst = "critical";
                break;
            }
            worst = "warning";
        }
        if (!a.safe() && violations.isEmpty()) {
            worst = "critical";
        }
        if ("critical".equals(worst)) {
            raise(rank, 2);
        } else if ("warning".equals(worst)) {
            raise(rank, 1);
        }
        Map<String, Object> section = new LinkedHashMap<>();
        section.put("status", "ok");
        section.put("breachCount", violations.size());
        section.put("worstSeverity", worst);
        section.put("breaches", violations);
        return section;
    }

    private Map<String, Object> buildTrafficSection(
            List<RoutePointVm> routePoints, List<AdsbAircraftClientVm> aircraft, int[] rank) {
        int warningCount = 0;
        int cautionCount = 0;
        Map<String, Object> nearest = null;
        double nearestNm = Double.MAX_VALUE;

        for (AdsbAircraftClientVm ac : aircraft) {
            if (Boolean.TRUE.equals(ac.onGround()) || ac.lat() == null || ac.lon() == null) {
                continue;
            }
            if (ac.altitudeFt() != null && ac.altitudeFt() > 5000.0) {
                continue;
            }
            double minNm = Double.MAX_VALUE;
            for (RoutePointVm p : routePoints) {
                minNm = Math.min(minNm, haversineNm(p.lat(), p.lon(), ac.lat(), ac.lon()));
            }
            if (minNm <= 1.5) {
                warningCount++;
            } else if (minNm <= 3.0) {
                cautionCount++;
            } else {
                continue;
            }
            if (minNm < nearestNm) {
                nearestNm = minNm;
                Map<String, Object> nearMap = new LinkedHashMap<>();
                nearMap.put("callsign", ac.callsign());
                nearMap.put("hex", ac.hex());
                nearMap.put("distanceNm", Math.round(minNm * 100.0) / 100.0);
                nearMap.put("altFt", ac.altitudeFt());
                nearest = nearMap;
            }
        }

        if (warningCount > 0) {
            raise(rank, 2);
        } else if (cautionCount > 0) {
            raise(rank, 1);
        }

        Map<String, Object> section = new LinkedHashMap<>();
        section.put("status", "ok");
        section.put("nearbyCount", warningCount + cautionCount);
        section.put("cautionCount", cautionCount);
        section.put("warningCount", warningCount);
        section.put("nearest", nearest);
        return section;
    }

    private Map<String, Object> buildNotamSection(
            List<RoutePointVm> routePoints, double altM, List<NotamItemClientVm> notams, int[] rank) {
        double ceilingFt = altM * 3.28084 + 500.0;
        double bufferNm = 3.0;

        List<NotamItemClientVm> relevant = notams.stream().filter(n -> {
            Integer lowerFt = n.effectiveLowerFt();
            if (lowerFt != null && lowerFt > ceilingFt) {
                return false;
            }
            if (n.latitude() == null || n.longitude() == null || n.radiusNm() == null || routePoints.isEmpty()) {
                return true;
            }
            double reach = n.radiusNm() + bufferNm;
            return routePoints.stream().anyMatch(p -> haversineNm(p.lat(), p.lon(), n.latitude(), n.longitude()) <= reach);
        }).toList();

        long criticalCount = relevant.stream().filter(n -> "critical".equalsIgnoreCase(n.significance())).count();
        long warningCount = relevant.stream().filter(n -> "warning".equalsIgnoreCase(n.significance())).count();
        if (criticalCount > 0) {
            raise(rank, 1);
        }

        List<Map<String, Object>> items = relevant.stream().limit(8).map(n -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ref", n.id());
            m.put("subject", n.subject());
            m.put("significance", n.significance());
            m.put("scope", n.scope());
            m.put("text", n.text());
            m.put("end", n.effectiveEnd());
            m.put("permanent", n.permanent());
            return m;
        }).toList();

        boolean vi = LocaleUtils.isVietnamese();
        Map<String, Object> section = new LinkedHashMap<>();
        section.put("status", "ok");
        section.put("total", notams.size());
        section.put("relevantCount", relevant.size());
        section.put("criticalCount", criticalCount);
        section.put("warningCount", warningCount);
        section.put("items", items);
        if (vi) {
            section.put("message", relevant.isEmpty()
                    ? "Không có NOTAM hiệu lực ảnh hưởng đến lộ trình này"
                    : "Có " + relevant.size() + " NOTAM hiệu lực trên lộ trình"
                            + (criticalCount > 0 ? ", " + criticalCount + " khu vực cấm/nguy hiểm" : ""));
        } else {
            section.put("message", relevant.isEmpty()
                    ? "No active NOTAMs affecting this route"
                    : relevant.size() + " active NOTAM(s) on route"
                            + (criticalCount > 0 ? ", " + criticalCount + " restricted/danger area" : ""));
        }
        return section;
    }

    private static <T> Supplier<T> withExecutionContext(
            SecurityContext securityContext, Locale locale, Supplier<T> delegate) {
        return LocaleUtils.withLocale(locale, withSecurityContext(securityContext, delegate));
    }

    private static <T> Supplier<T> withSecurityContext(SecurityContext context, Supplier<T> delegate) {
        return () -> {
            SecurityContext previous = SecurityContextHolder.getContext();
            try {
                SecurityContextHolder.setContext(context);
                return delegate.get();
            } finally {
                if (previous == null || previous.getAuthentication() == null) {
                    SecurityContextHolder.clearContext();
                } else {
                    SecurityContextHolder.setContext(previous);
                }
            }
        };
    }

    private void raise(int[] current, int target) {
        if (target > current[0]) {
            current[0] = target;
        }
    }

    private double haversineNm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0);
        double meters = 2.0 * EARTH_RADIUS_M * Math.asin(Math.min(1.0, Math.sqrt(a)));
        return meters / METERS_PER_NM;
    }
}
